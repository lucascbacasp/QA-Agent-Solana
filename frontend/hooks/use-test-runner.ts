"use client";
import { useState, useCallback, useRef } from "react";
import { runAllTests, type RealTestCallbacks } from "@/lib/real-tests";
import { saveReport } from "@/lib/store";
import type { TestResult, QAReport } from "@/lib/types";

export type RunnerStatus = "idle" | "running" | "done" | "failed";

export interface StepState {
  name: string;
  label: string;
  status: "pending" | "running" | "done" | "failed";
  result?: TestResult;
}

const TEST_LABELS: Record<string, string> = {
  url_access_check: "Check URL accessibility",
  wallet_balance_check: "Check wallet balances",
  pool_state_check: "Read pool state on-chain",
  price_peg_check: "Compare price peg (on-chain vs Jupiter)",
  vault_status_check: "Check vault status (jitoSOL, mSOL, bSOL)",
  stake_jitosol: "Stake jitoSOL → mpSOL (real TX)",
  unstake_mpsol: "Unstake mpSOL → ticket (real TX)",
};

const READ_TESTS = [
  "url_access_check",
  "wallet_balance_check",
  "pool_state_check",
  "price_peg_check",
  "vault_status_check",
];

const TX_TESTS = [
  "stake_jitosol",
  "unstake_mpsol",
];

export function useTestRunner() {
  const [steps, setSteps] = useState<StepState[]>([]);
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<QAReport | null>(null);
  const runningRef = useRef(false);

  const start = useCallback(async (targetUrl: string, walletAddress: string, includeTxTests: boolean) => {
    if (runningRef.current) return;
    runningRef.current = true;

    const testNames = includeTxTests ? [...READ_TESTS, ...TX_TESTS] : READ_TESTS;

    setUrl(targetUrl);
    setStatus("running");
    setReport(null);
    setSteps(testNames.map((name) => ({ name, label: TEST_LABELS[name], status: "pending" })));

    const callbacks: RealTestCallbacks = {
      onStepStart: (name) => {
        setSteps((prev) =>
          prev.map((s) => (s.name === name ? { ...s, status: "running" } : s))
        );
      },
      onStepDone: (result) => {
        setSteps((prev) =>
          prev.map((s) =>
            s.name === result.name
              ? { ...s, status: result.status === "PASS" || result.status === "SKIP" ? "done" : "failed", result }
              : s
          )
        );
      },
    };

    try {
      const results = await runAllTests(targetUrl, walletAddress, includeTxTests, callbacks);
      const hasFails = results.some((r) => r.status === "FAIL" || r.status === "ERROR");
      setStatus(hasFails ? "failed" : "done");

      const spentSOL = results.some((r) => r.txSignature) ? "~0.003 SOL (tx fees)" : "0 SOL (read-only)";

      const qaReport: QAReport = {
        timestamp: new Date().toISOString(),
        walletAddress,
        spendSummary: spentSOL,
        appUrl: targetUrl,
        overallStatus: hasFails ? "FAIL" : "PASS",
        results,
      };
      saveReport(qaReport);
      setReport(qaReport);
    } catch {
      setStatus("failed");
    } finally {
      runningRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setSteps([]);
    setStatus("idle");
    setUrl("");
    setReport(null);
  }, []);

  const doneCount = steps.filter((s) => s.status === "done" || s.status === "failed").length;
  const progress = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;

  return { steps, status, url, report, progress, start, reset };
}
