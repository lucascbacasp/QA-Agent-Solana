import "dotenv/config";
import {
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getWallet, getBalanceSOL } from "../core/wallet.js";
import { getConnection } from "../core/connection.js";
import { KNOWN_LSTS } from "../core/known-lsts.js";

const SWAP_AMOUNT_SOL = 0.06;
const TARGET_LST = "jitoSOL";

const JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_URL = "https://api.jup.ag/swap/v1/swap";
const SOL_MINT = "So11111111111111111111111111111111111111112";

async function main() {
  const wallet = getWallet();
  const conn = getConnection();
  const pubkey = wallet.publicKey.toBase58();

  console.log(`[Swap] Wallet: ${pubkey}`);
  const balance = await getBalanceSOL();
  console.log(`[Swap] Balance: ${balance.toFixed(6)} SOL`);

  if (balance < SWAP_AMOUNT_SOL + 0.01) {
    console.error(`[Swap] Not enough SOL. Need ${SWAP_AMOUNT_SOL} + 0.01 fees.`);
    process.exit(1);
  }

  const lst = KNOWN_LSTS.find((l) => l.name === TARGET_LST);
  if (!lst) {
    console.error(`[Swap] LST "${TARGET_LST}" not found.`);
    process.exit(1);
  }

  const inputLamports = Math.floor(SWAP_AMOUNT_SOL * LAMPORTS_PER_SOL);

  // Step 1: Get quote
  console.log(`[Swap] Getting quote: ${SWAP_AMOUNT_SOL} SOL → ${TARGET_LST}...`);
  const quoteUrl = `${JUPITER_QUOTE_URL}?inputMint=${SOL_MINT}&outputMint=${lst.mint.toBase58()}&amount=${inputLamports}&slippageBps=50`;
  const quoteResp = await fetch(quoteUrl);
  const quote = await quoteResp.json() as any;

  if (quote.error) {
    console.error(`[Swap] Quote error:`, quote.error);
    process.exit(1);
  }

  const outAmount = parseInt(quote.outAmount) / Math.pow(10, lst.decimals);
  console.log(`[Swap] Quote: ${SWAP_AMOUNT_SOL} SOL → ${outAmount.toFixed(6)} ${TARGET_LST}`);

  // Step 2: Get swap transaction
  console.log(`[Swap] Building swap transaction...`);
  const swapResp = await fetch(JUPITER_SWAP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: pubkey,
      wrapAndUnwrapSol: true,
    }),
  });
  const swapData = await swapResp.json() as any;

  if (swapData.error) {
    console.error(`[Swap] Swap error:`, swapData.error);
    process.exit(1);
  }

  // Step 3: Sign and send
  console.log(`[Swap] Signing and sending...`);
  const txBuf = Buffer.from(swapData.swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([wallet]);

  const signature = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  console.log(`[Swap] TX sent: ${signature}`);
  console.log(`[Swap] Confirming...`);

  const confirmation = await conn.confirmTransaction(
    { signature, ...(await conn.getLatestBlockhash()) },
    "confirmed"
  );
  if (confirmation.value.err) {
    console.error(`[Swap] TX failed:`, confirmation.value.err);
    process.exit(1);
  }

  console.log(`[Swap] Success! https://explorer.solana.com/tx/${signature}`);

  // Check balances after
  const balAfter = await getBalanceSOL();
  console.log(`[Swap] SOL balance after: ${balAfter.toFixed(6)} SOL`);
}

main().catch((err) => {
  console.error("[Swap] Error:", err.message);
  process.exit(1);
});
