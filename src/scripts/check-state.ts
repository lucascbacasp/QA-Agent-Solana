import "dotenv/config";
import { readPoolState, getJupiterPrice, getVaultState } from "../core/pool-reader.js";
import { KNOWN_LSTS } from "../core/known-lsts.js";

async function main() {
  console.log("[PoolState] Fetching mpSOL pool state...\n");

  const state = await readPoolState();
  const jupPrice = await getJupiterPrice();

  console.log(`[PoolState] mpSOL supply total: ${state.mpsolSupply.toFixed(4)} mpSOL`);
  console.log(`[PoolState] Backing SOL value: ${state.solBacking.toFixed(4)} SOL`);
  console.log(
    `[PoolState] Ratio: 1 SOL = ${state.ratio.toFixed(6)} mpSOL | 1 mpSOL = ${state.inverseRatio.toFixed(6)} SOL`
  );
  console.log(`[PoolState] Withdraw fee: ${state.withdrawFeeBp} bp (${(state.withdrawFeeBp / 100).toFixed(2)}%)`);
  console.log(`[PoolState] Outstanding tickets: ${state.outstandingTicketsSOL.toFixed(4)} SOL`);
  console.log(`[PoolState] Unstake waiting hours: ${state.waitingHours}h`);

  if (jupPrice !== null) {
    const deviation = state.inverseRatio > 0
      ? Math.abs(jupPrice - state.inverseRatio) / state.inverseRatio * 100
      : 0;
    console.log(
      `[PoolState] Jupiter price: ${jupPrice.toFixed(6)} SOL | Deviation: ${deviation.toFixed(3)}%`
    );
  } else {
    console.log("[PoolState] Jupiter price: unavailable");
  }

  // Check vaults
  console.log("\n[Vaults] Checking LST vaults...");
  for (const lst of KNOWN_LSTS) {
    const vault = await getVaultState(lst.mint);
    if (vault) {
      console.log(`  ${lst.name}: total=${vault.vaultTotalLst.toFixed(4)} | local=${vault.locallyStored.toFixed(4)} | deposits=${vault.depositsDisabled ? "DISABLED" : "enabled"}`);
    } else {
      console.log(`  ${lst.name}: no vault found`);
    }
  }
}

main().catch((err) => {
  console.error("[PoolState] Error:", err.message);
  process.exit(1);
});
