// Ported from src/core/types.ts + extended for UI

export type TestStatus = "PASS" | "FAIL" | "ERROR" | "SKIP";

export interface TestResult {
  name: string;
  status: TestStatus;
  durationMs: number;
  details?: Record<string, string | number>;
  txSignature?: string;
  error?: string;
}

export interface QAReport {
  timestamp: string;
  walletAddress: string;
  spendSummary: string;
  results: TestResult[];
  overallStatus: TestStatus;
  appUrl?: string;
}

export type StepStatus = "pending" | "running" | "done" | "failed";

export interface UITestStep {
  id: string;
  label: string;
  description: string;
  durationMs: number;
  status: StepStatus;
}
