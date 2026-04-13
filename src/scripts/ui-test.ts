import "dotenv/config";
import {
  prepareUITest,
  readBalances,
  generateUITestReport,
  printUITestReport,
} from "../ui-tests/ui-stake-test.js";

const APP_URL = process.argv[2] || process.env.APP_URL || "";
const MODE = process.argv[3] || "prepare"; // "prepare" | "verify" | "report"

if (!APP_URL) {
  console.error(`
Usage:
  npm run ui-test <APP_URL>                   # Prepare injection scripts
  npm run ui-test <APP_URL> verify            # Check post-test balances
  npm run ui-test <APP_URL> report [TX_SIG]   # Generate full report

Example:
  npm run ui-test https://sol.metapool.app/
  npm run ui-test https://sol.metapool.app/ verify
  npm run ui-test https://sol.metapool.app/ report 5xK3abc...
`);
  process.exit(1);
}

async function main() {
  if (MODE === "prepare") {
    console.log("[UI Test] Preparing context...\n");
    const ctx = await prepareUITest({ appUrl: APP_URL });

    console.log(`  App URL:        ${APP_URL}`);
    console.log(`  QA Wallet:      ${ctx.publicKey}`);
    console.log(`  UI shows as:    ${ctx.publicKeyShort}`);
    console.log(`\n  Pre-balances:`);
    console.log(`    SOL:     ${ctx.preBalances.sol.toFixed(6)}`);
    console.log(`    jitoSOL: ${ctx.preBalances.jitoSOL.toFixed(6)}`);
    console.log(`    mpSOL:   ${ctx.preBalances.mpSOL.toFixed(6)}`);

    console.log(`\n${"─".repeat(60)}`);
    console.log("  STEP 1 SCRIPT — Run immediately after navigation:");
    console.log(`${"─".repeat(60)}\n`);
    console.log(ctx.step1Script);

    console.log(`\n${"─".repeat(60)}`);
    console.log("  STEP 2+3 SCRIPT — Run after app hydrates (~3-4s):");
    console.log(`${"─".repeat(60)}\n`);
    console.log(ctx.step2Script);

    console.log(`\n${"─".repeat(60)}`);
    console.log("  BROWSER TEST STEPS:");
    console.log(`${"─".repeat(60)}`);
    console.log("  1. Navigate to:", APP_URL);
    console.log("  2. Execute STEP 1 script in browser console");
    console.log("  3. Wait 3-4 seconds for app hydration");
    console.log("  4. Execute STEP 2+3 script in browser console");
    console.log("  5. Wait for '[QA Wallet] READY' in console");
    console.log("  6. Verify wallet shows:", ctx.publicKeyShort);
    console.log("  7. Verify token balances display correctly");
    console.log("  8. Click the action button (Upgrade/Stake/Unstake)");
    console.log("  9. Wait for TX confirmation in console");
    console.log(" 10. Run: npm run ui-test", APP_URL, "verify");
  }

  if (MODE === "verify") {
    console.log("[UI Test] Post-test balances:\n");
    const balances = await readBalances();
    console.log(`  SOL:     ${balances.sol.toFixed(6)}`);
    console.log(`  jitoSOL: ${balances.jitoSOL.toFixed(6)}`);
    console.log(`  mpSOL:   ${balances.mpSOL.toFixed(6)}`);
  }

  if (MODE === "report") {
    const txSig = process.argv[4] || undefined;

    // Read pre-balances from env or use current as approximation
    // In practice, pre-balances should be saved during "prepare"
    console.log("[UI Test] Generating report...\n");
    const postBalances = await readBalances();

    // If no pre-balances stored, we use post-balances as both (manual comparison)
    const preBalancesStr = process.env.UI_TEST_PRE_BALANCES;
    let preBalances = postBalances;
    if (preBalancesStr) {
      preBalances = JSON.parse(preBalancesStr);
    }

    const report = await generateUITestReport(
      { appUrl: APP_URL, description: "UI Stake Test via Browser" },
      preBalances,
      txSig,
    );
    printUITestReport(report);
  }
}

main().catch((err) => {
  console.error("[UI Test] Error:", err.message);
  process.exit(1);
});
