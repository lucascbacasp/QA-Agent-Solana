import type { UITestStep } from "./types";

export function createTestSteps(): UITestStep[] {
  return [
    { id: "navigate", label: "Navigate to dApp", description: "Opening the target URL in browser", durationMs: 1200, status: "pending" },
    { id: "inject", label: "Inject QA wallet", description: "Override window.solana with QA keypair", durationMs: 1500, status: "pending" },
    { id: "hydrate", label: "Wait for app hydration", description: "React app initializes wallet adapter", durationMs: 2000, status: "pending" },
    { id: "connect", label: "Patch adapter & connect", description: "Patch React fiber + connect with real PublicKey", durationMs: 1800, status: "pending" },
    { id: "verify-wallet", label: "Verify wallet in UI", description: "Wallet address visible in header", durationMs: 1000, status: "pending" },
    { id: "verify-balances", label: "Verify balances display", description: "SOL, jitoSOL, mpSOL shown correctly", durationMs: 1500, status: "pending" },
    { id: "stake", label: "Execute stake action", description: "Click Upgrade button, sign + send TX", durationMs: 2500, status: "pending" },
    { id: "confirm", label: "Confirm transaction", description: "Wait for on-chain confirmation", durationMs: 3000, status: "pending" },
    { id: "verify-ui", label: "Verify UI update", description: "Balances updated in the app", durationMs: 1200, status: "pending" },
    { id: "cross-check", label: "Cross-check on-chain", description: "Compare UI balances with RPC data", durationMs: 1500, status: "pending" },
  ];
}
