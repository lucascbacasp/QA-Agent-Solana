import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getConnection } from "./connection.js";
import { CONFIG } from "./config.js";
import type { PoolState } from "./types.js";

/**
 * MainVaultState layout (from IDL):
 *   8  bytes — Anchor discriminator
 *  32  bytes — admin (pubkey)
 *  32  bytes — operator_auth (pubkey)
 *   2  bytes — withdraw_fee_bp (u16)
 *  30  bytes — _reserved_space ([u8; 30])
 *  32  bytes — mpsol_mint (pubkey)
 *  1+32 bytes — treasury_mpsol_account (Option<pubkey>)
 *   2  bytes — performance_fee_bp (u16)
 *   8  bytes — backing_sol_value (u64)      ← TVL
 *   8  bytes — outstanding_tickets_sol_value (u64)
 *   2  bytes — unstake_ticket_waiting_hours (u16)
 */
const OFFSET_ADMIN = 8;
const OFFSET_OPERATOR_AUTH = OFFSET_ADMIN + 32;          // 40
const OFFSET_WITHDRAW_FEE_BP = OFFSET_OPERATOR_AUTH + 32; // 72
const OFFSET_RESERVED = OFFSET_WITHDRAW_FEE_BP + 2;       // 74
const OFFSET_MPSOL_MINT = OFFSET_RESERVED + 30;           // 104
const OFFSET_TREASURY_OPT = OFFSET_MPSOL_MINT + 32;       // 136
// Option<pubkey> = 1 byte tag + 32 bytes (if Some)
const OFFSET_PERFORMANCE_FEE_BP = OFFSET_TREASURY_OPT + 1 + 32; // 169
const OFFSET_BACKING_SOL_VALUE = OFFSET_PERFORMANCE_FEE_BP + 2;  // 171
const OFFSET_OUTSTANDING_TICKETS = OFFSET_BACKING_SOL_VALUE + 8; // 179
const OFFSET_WAITING_HOURS = OFFSET_OUTSTANDING_TICKETS + 8;     // 187

export async function readPoolState(): Promise<PoolState> {
  const conn = getConnection();
  const info = await conn.getAccountInfo(CONFIG.MAIN_STATE);
  if (!info) {
    throw new Error("Main state account not found");
  }
  const data = info.data;

  // Read backing_sol_value (TVL in lamports)
  const backingLamports = Number(data.readBigUInt64LE(OFFSET_BACKING_SOL_VALUE));
  const solBacking = backingLamports / LAMPORTS_PER_SOL;

  // Read outstanding tickets
  const ticketsLamports = Number(data.readBigUInt64LE(OFFSET_OUTSTANDING_TICKETS));
  const outstandingTicketsSOL = ticketsLamports / LAMPORTS_PER_SOL;

  // Read withdraw fee
  const withdrawFeeBp = data.readUInt16LE(OFFSET_WITHDRAW_FEE_BP);

  // Read waiting hours
  const waitingHours = data.readUInt16LE(OFFSET_WAITING_HOURS);

  // Get mpSOL mint supply
  const mintInfo = await conn.getParsedAccountInfo(CONFIG.MPSOL_MINT);
  let mpsolSupply = 0;
  let decimals = 9;
  if (mintInfo.value?.data && "parsed" in mintInfo.value.data) {
    const parsed = mintInfo.value.data.parsed;
    decimals = parsed.info.decimals;
    mpsolSupply = parseFloat(parsed.info.supply) / Math.pow(10, decimals);
  }

  // Calculate ratios
  const ratio = solBacking > 0 ? mpsolSupply / solBacking : 1;    // 1 SOL = X mpSOL
  const inverseRatio = ratio > 0 ? 1 / ratio : 1;                 // 1 mpSOL = X SOL

  return {
    mpsolSupply,
    solBacking,
    ratio,
    inverseRatio,
    isPaused: false, // No paused field in MainVaultState; vaults have deposits_disabled
    withdrawFeeBp,
    outstandingTicketsSOL,
    waitingHours,
  };
}

// Keep legacy alias
export const getEnrichedPoolState = readPoolState;

/**
 * Fetches the Jupiter price for mpSOL in SOL terms.
 * Uses the swap quote API as primary source (more reliable for smaller tokens),
 * with the price API v2 as fallback.
 */
export async function getJupiterPrice(): Promise<number | null> {
  const SOL_MINT = "So11111111111111111111111111111111111111112";
  const mpsolMint = CONFIG.MPSOL_MINT.toBase58();

  // Strategy 1: Swap quote (1 mpSOL → SOL)
  try {
    const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${mpsolMint}&outputMint=${SOL_MINT}&amount=1000000000&slippageBps=100`;
    const resp = await fetch(quoteUrl);
    const quote = (await resp.json()) as any;
    if (quote.outAmount) {
      return parseInt(quote.outAmount) / 1e9; // 1 mpSOL = X SOL
    }
  } catch { /* fallback */ }

  // Strategy 2: Price API v2
  try {
    const url = `${CONFIG.JUPITER_PRICE_API}?ids=${mpsolMint},${SOL_MINT}`;
    const resp = await fetch(url);
    const json = (await resp.json()) as any;
    const mpsolUsd = json.data?.[mpsolMint]?.price ? parseFloat(json.data[mpsolMint].price) : null;
    const solUsd = json.data?.[SOL_MINT]?.price ? parseFloat(json.data[SOL_MINT].price) : null;
    if (mpsolUsd && solUsd && solUsd > 0) {
      return mpsolUsd / solUsd;
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * Reads a SecondaryVaultState for a given LST mint.
 * Vault PDA = seeds["secondary_vault", main_state, lst_mint]
 */
export async function getVaultState(lstMint: PublicKey): Promise<{
  vaultPda: PublicKey;
  lstSolPriceP32: bigint;
  vaultTotalLst: number;
  locallyStored: number;
  depositsDisabled: boolean;
  ticketsTargetSol: number;
} | null> {
  const conn = getConnection();

  // PDA seeds: [main_state, lst_mint] (from IDL)
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [CONFIG.MAIN_STATE.toBuffer(), lstMint.toBuffer()],
    CONFIG.MPSOL_PROGRAM_ID
  );

  const info = await conn.getAccountInfo(vaultPda);
  if (!info) return null;

  const data = info.data;
  // SecondaryVaultState layout (after 8-byte discriminator):
  // 32 bytes — lst_mint
  //  8 bytes — lst_sol_price_p32
  //  8 bytes — lst_sol_price_timestamp
  //  8 bytes — vault_total_lst_amount
  //  8 bytes — locally_stored_amount
  //  8 bytes — in_strategies_amount
  //  8 bytes — tickets_target_sol_amount
  //  1 byte  — deposits_disabled
  //  8 bytes — token_deposit_cap
  const offset = 8;
  const lstSolPriceP32 = data.readBigUInt64LE(offset + 32);
  const vaultTotalLst = Number(data.readBigUInt64LE(offset + 48)) / 1e9;
  const locallyStored = Number(data.readBigUInt64LE(offset + 56)) / 1e9;
  const depositsDisabled = data[offset + 80] !== 0;
  const ticketsTargetSol = Number(data.readBigUInt64LE(offset + 72)) / LAMPORTS_PER_SOL;

  return { vaultPda, lstSolPriceP32, vaultTotalLst, locallyStored, depositsDisabled, ticketsTargetSol };
}
