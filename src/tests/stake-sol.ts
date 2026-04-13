import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
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

const STAKE_AMOUNT = 0.005; // Amount of LST to stake (small for QA)

/**
 * Finds the first LST the wallet holds and stakes it into mpSOL.
 * Instruction: stake(lst_amount: u64, ref_code: u32)
 */
export async function stakeSOL(): Promise<TestResult> {
  const start = Date.now();

  try {
    const wallet = getWallet();
    const conn = getConnection();

    // Find an LST the wallet holds
    let selectedLst: { name: string; mint: PublicKey; balance: number; decimals: number; poolState: PublicKey } | null = null;

    for (const lst of KNOWN_LSTS) {
      const ata = getAssociatedTokenAddressSync(lst.mint, wallet.publicKey);
      try {
        const info = await conn.getParsedAccountInfo(ata);
        if (info.value?.data && "parsed" in info.value.data) {
          const bal = parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
          if (bal >= STAKE_AMOUNT) {
            selectedLst = { name: lst.name, mint: lst.mint, balance: bal, decimals: lst.decimals, poolState: lst.poolState };
            break;
          }
        }
      } catch { /* ATA doesn't exist */ }
    }

    if (!selectedLst) {
      return {
        name: "stake_sol",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: `No LST balance found (need >= ${STAKE_AMOUNT}). Fund the QA wallet with jitoSOL, mSOL, or bSOL.`,
      };
    }

    // Check vault exists and accepts deposits
    const vault = await getVaultState(selectedLst.mint);
    if (!vault) {
      return {
        name: "stake_sol",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: `No vault found for ${selectedLst.name}`,
      };
    }
    if (vault.depositsDisabled) {
      return {
        name: "stake_sol",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: `Deposits disabled for ${selectedLst.name} vault`,
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

    // Depositor LST ATA
    const depositorLstAta = getAssociatedTokenAddressSync(selectedLst.mint, wallet.publicKey);

    // Vault LST ATA (owned by vaults_ata_pda_auth)
    // PDA seeds: [main_state, "vaults-ata-auth"]
    const [vaultsAtaPdaAuth] = PublicKey.findProgramAddressSync(
      [CONFIG.MAIN_STATE.toBuffer(), Buffer.from("vaults-ata-auth")],
      CONFIG.MPSOL_PROGRAM_ID
    );
    const vaultLstAccount = getAssociatedTokenAddressSync(selectedLst.mint, vaultsAtaPdaAuth, true);

    // mpSOL mint authority PDA
    // PDA seeds: [main_state, "main-mint"]
    const [mpsolMintAuth] = PublicKey.findProgramAddressSync(
      [CONFIG.MAIN_STATE.toBuffer(), Buffer.from("main-mint")],
      CONFIG.MPSOL_PROGRAM_ID
    );

    // Build instructions
    const instructions: TransactionInstruction[] = [];

    // Ensure mpSOL ATA exists
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, mpsolAta, wallet.publicKey, CONFIG.MPSOL_MINT
      )
    );

    // Build stake instruction
    // Discriminator: sha256("global:stake")[0..8]
    const discriminator = createHash("sha256").update("global:stake").digest().subarray(0, 8);

    // Args: lst_amount (u64) + ref_code (u32)
    const lstAmount = BigInt(Math.floor(STAKE_AMOUNT * Math.pow(10, selectedLst.decimals)));
    const argsBuf = Buffer.alloc(12);
    argsBuf.writeBigUInt64LE(lstAmount, 0);
    argsBuf.writeUInt32LE(0, 8); // ref_code = 0

    const data = Buffer.concat([discriminator, argsBuf]);

    instructions.push(
      new TransactionInstruction({
        programId: CONFIG.MPSOL_PROGRAM_ID,
        keys: [
          { pubkey: CONFIG.MAIN_STATE, isSigner: false, isWritable: true },
          { pubkey: selectedLst.mint, isSigner: false, isWritable: false },
          { pubkey: vault.vaultPda, isSigner: false, isWritable: true },
          { pubkey: vaultsAtaPdaAuth, isSigner: false, isWritable: false },
          { pubkey: vaultLstAccount, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: depositorLstAta, isSigner: false, isWritable: true },
          { pubkey: CONFIG.MPSOL_MINT, isSigner: false, isWritable: true },
          { pubkey: mpsolMintAuth, isSigner: false, isWritable: false },
          { pubkey: mpsolAta, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          // remaining_accounts[0]: SPL Stake Pool / Marinade state for price update
          { pubkey: selectedLst.poolState, isSigner: false, isWritable: false },
        ],
        data,
      })
    );

    const { signature, costSOL } = await sendTx(instructions, 0.002);

    // Check mpSOL balance after
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
      name: "stake_sol",
      status: "PASS",
      durationMs: Date.now() - start,
      txSignature: signature,
      details: {
        "LST used": selectedLst.name,
        "Amount staked": `${STAKE_AMOUNT} ${selectedLst.name}`,
        "mpSOL received": mpsolReceived > 0 ? mpsolReceived.toFixed(6) : "N/A (dry run)",
        "Cost": `${costSOL.toFixed(6)} SOL`,
        "TX": CONFIG.DRY_RUN ? "DRY_RUN" : explorerUrl(signature),
      },
    };
  } catch (err: any) {
    return {
      name: "stake_sol",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}
