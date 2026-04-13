import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection } from "./connection.js";
import { CONFIG } from "./config.js";

let wallet: Keypair | null = null;

export function getWallet(): Keypair {
  if (!wallet) {
    const raw = process.env.QA_WALLET_PRIVATE_KEY;
    if (!raw) {
      throw new Error("QA_WALLET_PRIVATE_KEY not set in environment");
    }
    const secretKey = Uint8Array.from(JSON.parse(raw));
    wallet = Keypair.fromSecretKey(secretKey);
  }
  return wallet;
}

export async function getBalanceSOL(): Promise<number> {
  const conn = getConnection();
  const balance = await conn.getBalance(getWallet().publicKey);
  return balance / LAMPORTS_PER_SOL;
}

export async function assertMinBalance(requiredSOL: number): Promise<void> {
  if (CONFIG.DRY_RUN) return;
  const balance = await getBalanceSOL();
  const minNeeded = requiredSOL + CONFIG.MIN_WALLET_BALANCE_SOL;
  if (balance < minNeeded) {
    throw new Error(
      `Insufficient balance: ${balance.toFixed(6)} SOL, need at least ${minNeeded.toFixed(6)} SOL (${requiredSOL} + ${CONFIG.MIN_WALLET_BALANCE_SOL} reserve)`
    );
  }
}
