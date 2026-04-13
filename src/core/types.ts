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
}

export interface PoolState {
  mpsolSupply: number;
  solBacking: number;        // backing_sol_value from MainVaultState
  ratio: number;             // 1 SOL = X mpSOL
  inverseRatio: number;      // 1 mpSOL = X SOL
  isPaused: boolean;
  withdrawFeeBp: number;     // basis points
  outstandingTicketsSOL: number;
  waitingHours: number;
}
