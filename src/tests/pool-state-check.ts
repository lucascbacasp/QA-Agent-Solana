import { readPoolState } from "../core/pool-reader.js";
import type { TestResult } from "../core/types.js";

export async function poolStateCheck(): Promise<TestResult> {
  const start = Date.now();

  try {
    const state = await readPoolState();

    const details: Record<string, string | number> = {
      "mpSOL supply": `${state.mpsolSupply.toFixed(4)} mpSOL`,
      "Backing SOL": `${state.solBacking.toFixed(4)} SOL`,
      "Ratio (1 SOL)": `${state.ratio.toFixed(6)} mpSOL`,
      "Ratio (1 mpSOL)": `${state.inverseRatio.toFixed(6)} SOL`,
      "Withdraw fee": `${state.withdrawFeeBp} bp`,
      "Waiting hours": `${state.waitingHours}h`,
      "Outstanding tickets": `${state.outstandingTicketsSOL.toFixed(4)} SOL`,
    };

    // Sanity checks
    if (state.mpsolSupply <= 0) {
      return {
        name: "pool_state_check",
        status: "FAIL",
        durationMs: Date.now() - start,
        details,
        error: "mpSOL supply is zero or negative",
      };
    }

    if (state.solBacking <= 0) {
      return {
        name: "pool_state_check",
        status: "FAIL",
        durationMs: Date.now() - start,
        details,
        error: "Backing SOL value is zero — protocol may be drained or state corrupted",
      };
    }

    // Ratio should be close to 1.0 for a healthy LST
    if (state.ratio <= 0.1 || state.ratio > 10) {
      return {
        name: "pool_state_check",
        status: "FAIL",
        durationMs: Date.now() - start,
        details,
        error: `Ratio out of sane range: ${state.ratio.toFixed(6)}`,
      };
    }

    return {
      name: "pool_state_check",
      status: "PASS",
      durationMs: Date.now() - start,
      details,
    };
  } catch (err: any) {
    return {
      name: "pool_state_check",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}
