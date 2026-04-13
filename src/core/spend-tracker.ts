import { CONFIG } from "./config.js";

class SpendTracker {
  private sessionSpent = 0;

  get spent(): number {
    return this.sessionSpent;
  }

  get remaining(): number {
    return CONFIG.MAX_SPEND_PER_SESSION - this.sessionSpent;
  }

  checkTestBudget(estimatedCostSOL: number): void {
    if (estimatedCostSOL > CONFIG.MAX_SPEND_PER_TEST) {
      throw new Error(
        `Test cost ${estimatedCostSOL} SOL exceeds per-test limit of ${CONFIG.MAX_SPEND_PER_TEST} SOL`
      );
    }
    if (this.sessionSpent + estimatedCostSOL > CONFIG.MAX_SPEND_PER_SESSION) {
      throw new Error(
        `Session spend would reach ${(this.sessionSpent + estimatedCostSOL).toFixed(6)} SOL, exceeding limit of ${CONFIG.MAX_SPEND_PER_SESSION} SOL`
      );
    }
  }

  record(costSOL: number): void {
    this.sessionSpent += costSOL;
  }

  summary(): string {
    return `${this.sessionSpent.toFixed(6)} SOL / ${CONFIG.MAX_SPEND_PER_SESSION} SOL limit`;
  }
}

export const spendTracker = new SpendTracker();
