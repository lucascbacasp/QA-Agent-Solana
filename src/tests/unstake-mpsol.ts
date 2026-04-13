import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createHash } from "crypto";
import { getWallet } from "../core/wallet.js";
import { getConnection } from "../core/connection.js";
import { sendTx, explorerUrl } from "../core/tx-utils.js";
import { CONFIG } from "../core/config.js";
import { readPoolState } from "../core/pool-reader.js";
import type { TestResult } from "../core/types.js";

const UNSTAKE_MPSOL_AMOUNT = 0.003; // Small amount for testing

/**
 * Unstake mpSOL → creates an UnstakeTicket.
 * Instruction: unstake(mpsol_amount: u64)
 *
 * Note: This does NOT return SOL immediately. It creates a ticket
 * that can be claimed after `unstake_ticket_waiting_hours`.
 */
export async function unstakeMpsol(): Promise<TestResult> {
  const start = Date.now();

  try {
    const wallet = getWallet();
    const conn = getConnection();

    // Check mpSOL balance
    const mpsolAta = getAssociatedTokenAddressSync(CONFIG.MPSOL_MINT, wallet.publicKey);
    let mpsolBalance = 0;
    try {
      const info = await conn.getParsedAccountInfo(mpsolAta);
      if (info.value?.data && "parsed" in info.value.data) {
        mpsolBalance = parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
      }
    } catch {
      return {
        name: "unstake_mpsol",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: "No mpSOL ATA found — run stake test first",
      };
    }

    if (mpsolBalance < UNSTAKE_MPSOL_AMOUNT) {
      return {
        name: "unstake_mpsol",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: `Insufficient mpSOL: ${mpsolBalance.toFixed(6)} (need ${UNSTAKE_MPSOL_AMOUNT})`,
      };
    }

    // Read pool state for treasury account and waiting hours info
    const poolState = await readPoolState();

    // Treasury mpSOL account — read from main state data
    const mainInfo = await conn.getAccountInfo(CONFIG.MAIN_STATE);
    if (!mainInfo) throw new Error("Main state account not found");

    // Read treasury Option<Pubkey> at offset 136
    const treasuryTag = mainInfo.data[136];
    let treasuryMpsolAccount: PublicKey;
    if (treasuryTag === 1) {
      treasuryMpsolAccount = new PublicKey(mainInfo.data.subarray(137, 169));
    } else {
      // No treasury set — this is unusual, might fail
      return {
        name: "unstake_mpsol",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: "Treasury mpSOL account not configured in main state",
      };
    }

    // Generate a new keypair for the unstake ticket account
    const ticketKeypair = Keypair.generate();

    // Build unstake instruction
    // Discriminator: sha256("global:unstake")[0..8]
    const discriminator = createHash("sha256").update("global:unstake").digest().subarray(0, 8);

    const mpsolAmount = BigInt(Math.floor(UNSTAKE_MPSOL_AMOUNT * 1e9));
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(mpsolAmount);

    const data = Buffer.concat([discriminator, amountBuf]);

    const instructions: TransactionInstruction[] = [
      new TransactionInstruction({
        programId: CONFIG.MPSOL_PROGRAM_ID,
        keys: [
          { pubkey: CONFIG.MAIN_STATE, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: mpsolAta, isSigner: false, isWritable: true },
          { pubkey: CONFIG.MPSOL_MINT, isSigner: false, isWritable: true },
          { pubkey: treasuryMpsolAccount, isSigner: false, isWritable: true },
          { pubkey: ticketKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      }),
    ];

    // Need to add ticket keypair as additional signer
    const { signature, costSOL } = await sendTxWithExtraSigners(
      instructions,
      0.003,
      [ticketKeypair]
    );

    return {
      name: "unstake_mpsol",
      status: "PASS",
      durationMs: Date.now() - start,
      txSignature: signature,
      details: {
        "mpSOL unstaked": UNSTAKE_MPSOL_AMOUNT.toString(),
        "Ticket account": ticketKeypair.publicKey.toBase58(),
        "Waiting hours": poolState.waitingHours.toString(),
        "Cost": `${costSOL.toFixed(6)} SOL`,
        "TX": CONFIG.DRY_RUN ? "DRY_RUN" : explorerUrl(signature),
      },
    };
  } catch (err: any) {
    return {
      name: "unstake_mpsol",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}

/**
 * sendTx variant that supports additional signers (for ticket keypair).
 */
async function sendTxWithExtraSigners(
  instructions: TransactionInstruction[],
  estimatedCostSOL: number,
  extraSigners: Keypair[],
): Promise<{ signature: string; costSOL: number }> {
  const { spendTracker } = await import("../core/spend-tracker.js");
  const { getConnection } = await import("../core/connection.js");
  const { getWallet, getBalanceSOL } = await import("../core/wallet.js");
  const { Transaction, sendAndConfirmTransaction } = await import("@solana/web3.js");

  spendTracker.checkTestBudget(estimatedCostSOL);

  const conn = getConnection();
  const wallet = getWallet();

  if (CONFIG.DRY_RUN) {
    console.log(`  [DRY_RUN] Would send TX with ${instructions.length} instruction(s), estimated cost: ${estimatedCostSOL} SOL`);
    return { signature: "DRY_RUN_" + Date.now().toString(36), costSOL: 0 };
  }

  const balanceBefore = await getBalanceSOL();

  const tx = new Transaction().add(...instructions);
  tx.feePayer = wallet.publicKey;
  const latestBlockhash = await conn.getLatestBlockhash();
  tx.recentBlockhash = latestBlockhash.blockhash;

  const signature = await sendAndConfirmTransaction(conn, tx, [wallet, ...extraSigners], {
    commitment: "confirmed",
    maxRetries: 3,
  });

  const balanceAfter = await getBalanceSOL();
  const costSOL = balanceBefore - balanceAfter;
  spendTracker.record(costSOL);

  return { signature, costSOL };
}
