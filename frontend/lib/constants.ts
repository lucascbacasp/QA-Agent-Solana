// Protocol addresses (ported from src/core/config.ts + known-lsts.ts)
export const QA_WALLET = process.env.NEXT_PUBLIC_QA_WALLET || "GxQYMQTMKYFWHUbgWhaBjsBxtZCiLA8t3JLQaceab6b5";

// Helius free tier RPC — fallback hardcoded for static builds
const DEFAULT_RPC = "https://mainnet.helius-rpc.com/?api-key=d65fcbc3-d4a4-4739-8101-facb5086cedc";
export const HELIUS_RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || DEFAULT_RPC;

export const MPSOL_PROGRAM_ID = "MPSoLoEnfNRFReRZSVH2V8AffSmWSR4dVoBLFm1YpAW";
export const MPSOL_MINT = "mPsoLV53uAGXnPJw63W91t2VDqCVZcU5rTh3PWzxnLr";
export const MAIN_STATE = "mpsoLeuCF3LwrJWbzxNd81xRafePFfPhsNvGsAMhUAA";

export const TOKENS = [
  { symbol: "SOL", name: "Solana", mint: null, decimals: 9, color: "#9945FF" },
  { symbol: "jitoSOL", name: "Jito", mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", decimals: 9, color: "#58D665" },
  { symbol: "mpSOL", name: "Meta Pool", mint: MPSOL_MINT, decimals: 9, color: "#2DD4BF" },
] as const;
