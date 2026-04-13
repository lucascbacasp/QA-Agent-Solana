import { getEnrichedPoolState, getJupiterPrice } from "../core/pool-reader.js";
import type { TestResult } from "../core/types.js";

const MAX_DEVIATION_PCT = 3.0; // 3% max acceptable deviation (mpSOL is an LST-of-LSTs)

export async function pricePegCheck(): Promise<TestResult> {
  const start = Date.now();

  try {
    const state = await getEnrichedPoolState();
    const jupPrice = await getJupiterPrice();

    if (jupPrice === null) {
      return {
        name: "price_peg_check",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: "Jupiter price unavailable",
      };
    }

    const onChainPrice = state.inverseRatio; // 1 mpSOL = X SOL
    const deviation = onChainPrice > 0
      ? Math.abs(jupPrice - onChainPrice) / onChainPrice * 100
      : 0;

    const details: Record<string, string | number> = {
      "On-chain price": `${onChainPrice.toFixed(6)} SOL`,
      "Jupiter price": `${jupPrice.toFixed(6)} SOL`,
      "Deviation": `${deviation.toFixed(3)}%`,
    };

    if (deviation > MAX_DEVIATION_PCT) {
      return {
        name: "price_peg_check",
        status: "FAIL",
        durationMs: Date.now() - start,
        details,
        error: `Peg deviation ${deviation.toFixed(3)}% exceeds ${MAX_DEVIATION_PCT}% threshold`,
      };
    }

    return {
      name: "price_peg_check",
      status: "PASS",
      durationMs: Date.now() - start,
      details,
    };
  } catch (err: any) {
    return {
      name: "price_peg_check",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}
