import {
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createHash } from "crypto";
import { getWallet } from "../core/wallet.js";
import { getConnection } from "../core/connection.js";
import { sendTx, explorerUrl } from "../core/tx-utils.js";
import { CONFIG } from "../core/config.js";
import { KNOWN_LSTS } from "../core/known-lsts.js";
import { getVaultState } from "../core/pool-reader.js";
import type { TestResult } from "../core/types.js";

const STAKE_AMOUNT_JITOSOL = 0.003;

/**
 * Dedicated test: stake jitoSOL into mpSOL vault.
 * Validates that the jitoSOL vault specifically accepts deposits.
 */
export async function stakeLstJitoSOL(): Promise<TestResult> {
  const start = Date.now();

  try {
    const wallet = getWallet();
    const conn = getConnection();
    const jito = KNOWN_LSTS.find((l) => l.name === "jitoSOL")!;

    // Check jitoSOL balance
    const jitoAta = getAssociatedTokenAddressSync(jito.mint, wallet.publicKey);
    let jitoBalance = 0;
    try {
      const info = await conn.getParsedAccountInfo(jitoAta);
      if (info.value?.data && "parsed" in info.value.data) {
        jitoBalance = parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
      }
    } catch {
      return {
        name: "stake_lst_jitoSOL",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: "No jitoSOL ATA found — fund wallet with jitoSOL first",
      };
    }

    if (jitoBalance < STAKE_AMOUNT_JITOSOL) {
      return {
        name: "stake_lst_jitoSOL",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: `Insufficient jitoSOL: ${jitoBalance.toFixed(6)} (need ${STAKE_AMOUNT_JITOSOL})`,
      };
    }

    // Check vault
    const vault = await getVaultState(jito.mint);
    if (!vault) {
      return {
        name: "stake_lst_jitoSOL",
        status: "FAIL",
        durationMs: Date.now() - start,
        error: "jitoSOL vault not found in mpSOL protocol",
      };
    }
    if (vault.depositsDisabled) {
      return {
        name: "stake_lst_jitoSOL",
        status: "FAIL",
        durationMs: Date.now() - start,
        error: "jitoSOL vault deposits are disabled",
      };
    }

    // mpSOL ATA
    const mpsolAta = getAssociatedTokenAddressSync(CONFIG.MPSOL_MINT, wallet.publicKey);
    let mpsolBefore = 0;
    try {
      const info = await conn.getParsedAccountInfo(mpsolAta);
      if (info.value?.data && "parsed" in info.value.data) {
        mpsolBefore = parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
      }
    } catch {}

    // PDAs
    const [vaultsAtaPdaAuth] = PublicKey.findProgramAddressSync(
      [CONFIG.MAIN_STATE.toBuffer(), Buffer.from("vaults-ata-auth")],
      CONFIG.MPSOL_PROGRAM_ID
    );
    const vaultLstAccount = getAssociatedTokenAddressSync(jito.mint, vaultsAtaPdaAuth, true);
    const [mpsolMintAuth] = PublicKey.findProgramAddressSync(
      [CONFIG.MAIN_STATE.toBuffer(), Buffer.from("main-mint")],
      CONFIG.MPSOL_PROGRAM_ID
    );

    // Build instructions
    const instructions: TransactionInstruction[] = [];

    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, mpsolAta, wallet.publicKey, CONFIG.MPSOL_MINT
      )
    );

    const discriminator = createHash("sha256").update("global:stake").digest().subarray(0, 8);
    const lstAmount = BigInt(Math.floor(STAKE_AMOUNT_JITOSOL * 1e9));
    const argsBuf = Buffer.alloc(12);
    argsBuf.writeBigUInt64LE(lstAmount, 0);
    argsBuf.writeUInt32LE(0, 8);
    const data = Buffer.concat([discriminator, argsBuf]);

    instructions.push(
      new TransactionInstruction({
        programId: CONFIG.MPSOL_PROGRAM_ID,
        keys: [
          { pubkey: CONFIG.MAIN_STATE, isSigner: false, isWritable: true },
          { pubkey: jito.mint, isSigner: false, isWritable: false },
          { pubkey: vault.vaultPda, isSigner: false, isWritable: true },
          { pubkey: vaultsAtaPdaAuth, isSigner: false, isWritable: false },
          { pubkey: vaultLstAccount, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: jitoAta, isSigner: false, isWritable: true },
          { pubkey: CONFIG.MPSOL_MINT, isSigner: false, isWritable: true },
          { pubkey: mpsolMintAuth, isSigner: false, isWritable: false },
          { pubkey: mpsolAta, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          // remaining_accounts[0]: Jito SPL Stake Pool state
          { pubkey: jito.poolState, isSigner: false, isWritable: false },
        ],
        data,
      })
    );

    const { signature, costSOL } = await sendTx(instructions, 0.002);

    // Check mpSOL received
    let mpsolAfter = mpsolBefore;
    if (!CONFIG.DRY_RUN) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const info = await conn.getParsedAccountInfo(mpsolAta);
        if (info.value?.data && "parsed" in info.value.data) {
          mpsolAfter = parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
        }
      } catch {}
    }

    const mpsolReceived = mpsolAfter - mpsolBefore;

    return {
      name: "stake_lst_jitoSOL",
      status: "PASS",
      durationMs: Date.now() - start,
      txSignature: signature,
      details: {
        "jitoSOL staked": STAKE_AMOUNT_JITOSOL.toString(),
        "mpSOL received": mpsolReceived > 0 ? mpsolReceived.toFixed(6) : "N/A (dry run)",
        "Vault total LST": vault.vaultTotalLst.toFixed(4),
        "Cost": `${costSOL.toFixed(6)} SOL`,
        "TX": CONFIG.DRY_RUN ? "DRY_RUN" : explorerUrl(signature),
      },
    };
  } catch (err: any) {
    return {
      name: "stake_lst_jitoSOL",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}
