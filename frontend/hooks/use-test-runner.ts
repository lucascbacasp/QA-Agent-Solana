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
};

const TEST_NAMES = [
  "url_access_check",
  "wallet_balance_check",
  "pool_state_check",
  "price_peg_check",
  "vault_status_check",
];

export function useTestRunner() {
  const [steps, setSteps] = useState<StepState[]>(() =>
    TEST_NAMES.map((name) => ({ name, label: TEST_LABELS[name], status: "pending" as const }))
  );
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<QAReport | null>(null);
  const runningRef = useRef(false);

  const start = useCallback(async (targetUrl: string, walletAddress: string) => {
    if (runningRef.current) return;
    runningRef.current = true;

    setUrl(targetUrl);
    setStatus("running");
    setReport(null);
    setSteps(TEST_NAMES.map((name) => ({ name, label: TEST_LABELS[name], status: "pending" })));

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
      const results = await runAllTests(targetUrl, walletAddress, callbacks);

      const hasFails = results.some((r) => r.status === "FAIL" || r.status === "ERROR");
      setStatus(hasFails ? "failed" : "done");

      const qaReport: QAReport = {
        timestamp: new Date().toISOString(),
        walletAddress,
        spendSummary: "0 SOL (read-only tests)",
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
    setSteps(TEST_NAMES.map((name) => ({ name, label: TEST_LABELS[name], status: "pending" })));
    setStatus("idle");
    setUrl("");
    setReport(null);
  }, []);

  const doneCount = steps.filter((s) => s.status === "done" || s.status === "failed").length;
  const progress = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;

  return { steps, status, url, report, progress, start, reset };
}
