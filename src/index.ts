import "dotenv/config";
import { getWallet, getBalanceSOL } from "./core/wallet.js";
import { spendTracker } from "./core/spend-tracker.js";
import { CONFIG } from "./core/config.js";
import { generateReport, printReport, sendAlert } from "./core/reporter.js";
import type { TestResult } from "./core/types.js";

// Tests
import { poolStateCheck } from "./tests/pool-state-check.js";
import { pricePegCheck } from "./tests/price-peg-check.js";
import { stakeSOL } from "./tests/stake-sol.js";
import { stakeLstJitoSOL } from "./tests/stake-lst-jitosol.js";
import { unstakeMpsol } from "./tests/unstake-mpsol.js";
import { roundTripSolMpsolLst } from "./tests/round-trip.js";

interface TestEntry {
  name: string;
  fn: () => Promise<TestResult>;
  requiresTx: boolean;
}

const ALL_TESTS: TestEntry[] = [
  { name: "pool_state_check", fn: poolStateCheck, requiresTx: false },
  { name: "price_peg_check", fn: pricePegCheck, requiresTx: false },
  { name: "stake_sol", fn: stakeSOL, requiresTx: true },
  { name: "stake_lst_jitoSOL", fn: stakeLstJitoSOL, requiresTx: true },
  { name: "unstake_mpsol", fn: unstakeMpsol, requiresTx: true },
  { name: "round_trip_sol_mpsol_lst", fn: roundTripSolMpsolLst, requiresTx: true },
];

async function main() {
  console.log("\n  META POOL mpSOL — QA Agent Starting...\n");

  // Validate wallet
  const wallet = getWallet();
  const pubkey = wallet.publicKey.toBase58();
  console.log(`  Wallet:     ${pubkey}`);
  console.log(`  RPC:        ${CONFIG.RPC_URL.replace(/api-key=.*/, "api-key=***")}`);
  console.log(`  Dry Run:    ${CONFIG.DRY_RUN}`);
  console.log(`  Session limit: ${CONFIG.MAX_SPEND_PER_SESSION} SOL\n`);

  const balance = await getBalanceSOL();
  console.log(`  Balance:    ${balance.toFixed(6)} SOL\n`);

  if (!CONFIG.DRY_RUN && balance < CONFIG.MIN_WALLET_BALANCE_SOL) {
    console.error(`  ERROR: Balance too low (< ${CONFIG.MIN_WALLET_BALANCE_SOL} SOL). Fund the QA wallet.`);
    process.exit(1);
  }

  // Determine which tests to run
  const testsToRun = CONFIG.DRY_RUN
    ? ALL_TESTS
    : ALL_TESTS; // Run all tests, each handles its own balance check

  // Execute tests sequentially
  const results: TestResult[] = [];
  for (const test of testsToRun) {
    console.log(`  Running: ${test.name}...`);
    const result = await test.fn();
    results.push(result);
    console.log(`  → ${result.status} (${(result.durationMs / 1000).toFixed(1)}s)\n`);
  }

  // Generate and print report
  const report = generateReport(results, pubkey, spendTracker.summary());
  printReport(report);

  // Send alert if failures
  await sendAlert(report);

  // Exit with error code if any failures
  const hasFails = results.some((r) => r.status === "FAIL" || r.status === "ERROR");
  process.exit(hasFails ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
