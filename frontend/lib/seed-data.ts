import type { QAReport } from "./types";

export const SEED_REPORTS: QAReport[] = [
  {
    timestamp: "2026-04-13T18:41:53.203Z",
    walletAddress: "GxQYMQTMKYFWHUbgWhaBjsBxtZCiLA8t3JLQaceab6b5",
    spendSummary: "0.003042 SOL / 0.05 SOL limit",
    appUrl: "https://sol.metapool.app/",
    overallStatus: "PASS",
    results: [
      { name: "pool_state_check", status: "PASS", durationMs: 500, details: { "mpSOL supply": "1529.49 mpSOL", "Backing SOL": "1777.51 SOL", "Ratio": "1 mpSOL = 1.162 SOL" } },
      { name: "price_peg_check", status: "PASS", durationMs: 1000, details: { "On-chain": "1.162 SOL", "Jupiter": "1.135 SOL", "Deviation": "2.34%" } },
      { name: "stake_sol", status: "PASS", durationMs: 6500, details: { "LST": "jitoSOL", "Staked": "0.005", "mpSOL received": "0.005478" }, txSignature: "4wa8aZZmMqH8QcJhRWs4afzTPQCAG7mvj5jiijZQnRPrj2UWvpNCNhjmUMBctxFxGjUvacCxgiR3xRuD8vHSPeqr" },
      { name: "stake_lst_jitoSOL", status: "PASS", durationMs: 5700, details: { "jitoSOL staked": "0.003", "mpSOL received": "0.003287" }, txSignature: "5VhAXbFfXXuqDLn9FWX65pjHFQZwjAur9fhX7DTsDPNvYTdTvpM8LNffvMH48sTmQeCVh24yzTMCEZ6fREN1oomE" },
      { name: "unstake_mpsol", status: "PASS", durationMs: 3500, details: { "mpSOL unstaked": "0.003", "Waiting hours": "240" }, txSignature: "5Xx5M7dJmq4fDxTEESK3daCjBhnLCN1NuaLtPoE1SyxpscVPxnsA9yRohmUgrUStV1tt24MiPp6cHtqnQPkfA4qS" },
      { name: "round_trip", status: "PASS", durationMs: 11700 },
    ],
  },
  {
    timestamp: "2026-04-13T19:01:05.000Z",
    walletAddress: "GxQYMQTMKYFWHUbgWhaBjsBxtZCiLA8t3JLQaceab6b5",
    spendSummary: "0.000000 SOL / 0.05 SOL limit",
    appUrl: "https://sol.metapool.app/",
    overallStatus: "PASS",
    results: [
      { name: "ui_wallet_connect", status: "PASS", durationMs: 8000, details: { "Wallet shown": "GxQY...b6b5" } },
      { name: "ui_balances_display", status: "PASS", durationMs: 5000, details: { "SOL": "0.02973", "jitoSOL": "0.02414", "mpSOL": "0.01319" } },
      { name: "ui_stake_jitosol", status: "PASS", durationMs: 15000, details: { "jitoSOL before": "0.02414", "jitoSOL after": "0.005", "mpSOL gained": "+0.02098" }, txSignature: "tSY3REvNSSssfDeHAa2tSPRYYBJok3qdYEWGQN8jChuP95C3P1LTLzB7GzCgP66LbLViHZPuzou4pSkd7GTR93w" },
    ],
  },
];
