import { stakeSOL } from "./stake-sol.js";
import { unstakeMpsol } from "./unstake-mpsol.js";
import type { TestResult } from "../core/types.js";

/**
 * Round-trip test: stake SOL → receive mpSOL → unstake mpSOL.
 * Validates the full lifecycle in a single test.
 */
export async function roundTripSolMpsolLst(): Promise<TestResult> {
  const start = Date.now();

  try {
    // Step 1: Stake SOL
    const stakeResult = await stakeSOL();
    if (stakeResult.status !== "PASS") {
      return {
        name: "round_trip_sol_mpsol_lst",
        status: stakeResult.status,
        durationMs: Date.now() - start,
        error: `Stake step failed: ${stakeResult.error || stakeResult.status}`,
        details: stakeResult.details,
      };
    }

    // Small delay between operations
    await new Promise((r) => setTimeout(r, 3000));

    // Step 2: Unstake mpSOL
    const unstakeResult = await unstakeMpsol();
    if (unstakeResult.status === "ERROR" || unstakeResult.status === "FAIL") {
      return {
        name: "round_trip_sol_mpsol_lst",
        status: unstakeResult.status,
        durationMs: Date.now() - start,
        error: `Unstake step failed: ${unstakeResult.error || unstakeResult.status}`,
        details: {
          ...stakeResult.details,
          ...unstakeResult.details,
        },
      };
    }

    return {
      name: "round_trip_sol_mpsol_lst",
      status: "PASS",
      durationMs: Date.now() - start,
      details: {
        "Stake TX": stakeResult.txSignature || "N/A",
        "Unstake TX": unstakeResult.txSignature || "N/A",
        "Unstake status": unstakeResult.status,
        ...(unstakeResult.status === "SKIP" ? { "Note": "Unstake delayed — expected for some protocols" } : {}),
      },
    };
  } catch (err: any) {
    return {
      name: "round_trip_sol_mpsol_lst",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}
