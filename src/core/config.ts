import "dotenv/config";
import { PublicKey } from "@solana/web3.js";

export const CONFIG = {
  // Protocol addresses
  MPSOL_PROGRAM_ID: new PublicKey("MPSoLoEnfNRFReRZSVH2V8AffSmWSR4dVoBLFm1YpAW"),
  MPSOL_MINT: new PublicKey("mPsoLV53uAGXnPJw63W91t2VDqCVZcU5rTh3PWzxnLr"),
  MAIN_STATE: new PublicKey("mpsoLeuCF3LwrJWbzxNd81xRafePFfPhsNvGsAMhUAA"),

  // RPC
  RPC_URL: process.env.HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com",

  // Spend limits (SOL)
  MAX_SPEND_PER_SESSION: parseFloat(process.env.MAX_SPEND_PER_SESSION || "0.05"),
  MAX_SPEND_PER_TEST: parseFloat(process.env.MAX_SPEND_PER_TEST || "0.015"),

  // Min balance to keep in wallet (for rent + fees)
  MIN_WALLET_BALANCE_SOL: 0.005,

  // Dry run mode
  DRY_RUN: process.env.DRY_RUN === "true",

  // Alert webhook
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL || "",

  // Jupiter API
  JUPITER_PRICE_API: "https://api.jup.ag/price/v2",
} as const;
