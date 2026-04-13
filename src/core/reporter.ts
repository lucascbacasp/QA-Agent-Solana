import type { QAReport, TestResult, TestStatus } from "./types.js";
import { CONFIG } from "./config.js";

const STATUS_ICON: Record<TestStatus, string> = {
  PASS: "PASS",
  FAIL: "FAIL",
  ERROR: "ERROR",
  SKIP: "SKIP",
};

export function generateReport(
  results: TestResult[],
  walletAddress: string,
  spendSummary: string,
): QAReport {
  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const errorCount = results.filter((r) => r.status === "ERROR").length;
  const skipCount = results.filter((r) => r.status === "SKIP").length;

  const overallStatus: TestStatus =
    failCount > 0 || errorCount > 0 ? "FAIL" : passCount > 0 ? "PASS" : "SKIP";

  return {
    timestamp: new Date().toISOString(),
    walletAddress,
    spendSummary,
    results,
    overallStatus,
  };
}

export function printReport(report: QAReport): void {
  const line = "=".repeat(54);
  const dash = "-".repeat(54);

  console.log(`\n${line}`);
  console.log("         META POOL mpSOL — QA REPORT");
  console.log(line);
  console.log(`  Fecha:    ${report.timestamp}`);
  console.log(`  Wallet:   ${report.walletAddress}`);
  console.log(`  Gasto:    ${report.spendSummary}`);
  if (CONFIG.DRY_RUN) {
    console.log(`  Mode:     DRY_RUN (no real transactions)`);
  }
  console.log(dash);

  const total = report.results.length;
  const pass = report.results.filter((r) => r.status === "PASS").length;
  const fail = report.results.filter((r) => r.status === "FAIL").length;
  const error = report.results.filter((r) => r.status === "ERROR").length;
  const skip = report.results.filter((r) => r.status === "SKIP").length;

  console.log(
    `  TOTAL: ${total} tests | PASS ${pass} | FAIL ${fail} | ERROR ${error} | SKIP ${skip}`
  );
  console.log(`  STATUS GENERAL: ${STATUS_ICON[report.overallStatus]} ${report.overallStatus}`);
  console.log(dash);
  console.log("\n  RESULTADOS:\n");

  for (const r of report.results) {
    const dur = (r.durationMs / 1000).toFixed(1);
    console.log(`  ${STATUS_ICON[r.status]} ${r.name.padEnd(36)} [${dur}s]`);

    if (r.error) {
      console.log(`     > Error: ${r.error}`);
    }

    if (r.details) {
      for (const [key, val] of Object.entries(r.details)) {
        console.log(`     > ${key}: ${val}`);
      }
    }
  }

  console.log(line);
}

export async function sendAlert(report: QAReport): Promise<void> {
  if (!CONFIG.ALERT_WEBHOOK_URL || report.overallStatus === "PASS") {
    return;
  }

  const failedTests = report.results
    .filter((r) => r.status === "FAIL" || r.status === "ERROR")
    .map((r) => `${r.status}: ${r.name} — ${r.error || "unknown"}`)
    .join("\n");

  const payload = {
    text: `mpSOL QA Alert: ${report.overallStatus}\n\nWallet: ${report.walletAddress}\nTimestamp: ${report.timestamp}\n\nFailed tests:\n${failedTests}`,
  };

  try {
    await fetch(CONFIG.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    console.error(`[Alert] Failed to send webhook: ${err.message}`);
  }
}
