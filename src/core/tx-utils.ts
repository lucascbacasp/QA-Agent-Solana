import {
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getConnection } from "./connection.js";
import { getWallet, getBalanceSOL } from "./wallet.js";
import { spendTracker } from "./spend-tracker.js";
import { CONFIG } from "./config.js";

export interface TxResult {
  signature: string;
  costSOL: number;
}

export async function sendTx(
  instructions: TransactionInstruction[],
  estimatedCostSOL: number,
): Promise<TxResult> {
  spendTracker.checkTestBudget(estimatedCostSOL);
  await assertNotPaused();

  const conn = getConnection();
  const wallet = getWallet();
  const balanceBefore = await getBalanceSOL();

  if (CONFIG.DRY_RUN) {
    console.log(`  [DRY_RUN] Would send TX with ${instructions.length} instruction(s), estimated cost: ${estimatedCostSOL} SOL`);
    return { signature: "DRY_RUN_" + Date.now().toString(36), costSOL: 0 };
  }

  const tx = new Transaction().add(...instructions);
  tx.feePayer = wallet.publicKey;
  const latestBlockhash = await conn.getLatestBlockhash();
  tx.recentBlockhash = latestBlockhash.blockhash;

  const signature = await sendAndConfirmTransaction(conn, tx, [wallet], {
    commitment: "confirmed",
    maxRetries: 3,
  });

  const balanceAfter = await getBalanceSOL();
  const costSOL = balanceBefore - balanceAfter;
  spendTracker.record(costSOL);

  return { signature, costSOL };
}

async function assertNotPaused(): Promise<void> {
  // Quick check: if we can't fetch main state, something is wrong
  const conn = getConnection();
  const info = await conn.getAccountInfo(CONFIG.MAIN_STATE);
  if (!info) {
    throw new Error("Main state account not found — protocol may be down");
  }
}

export function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}`;
}
