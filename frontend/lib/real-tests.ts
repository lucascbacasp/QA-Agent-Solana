/**
 * Real on-chain tests that run from the browser via RPC.
 * No private key needed — all read-only.
 */
import { HELIUS_RPC_URL, MPSOL_MINT, MAIN_STATE, QA_WALLET } from "./constants";
import type { TestResult } from "./types";

const JITOSOL_MINT = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
const MSOL_MINT = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
const BSOL_MINT = "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1";
const MPSOL_PROGRAM = "MPSoLoEnfNRFReRZSVH2V8AffSmWSR4dVoBLFm1YpAW";
const SOL_MINT = "So11111111111111111111111111111111111111112";

// Offsets from MainVaultState IDL layout (8-byte Anchor discriminator + fields)
const OFFSET_WITHDRAW_FEE_BP = 72;
const OFFSET_BACKING_SOL_VALUE = 171;
const OFFSET_OUTSTANDING_TICKETS = 179;
const OFFSET_WAITING_HOURS = 187;

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(HELIUS_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// ─────────────────────────────────────────────
// Test 1: Pool State Check
// ─────────────────────────────────────────────
export async function poolStateCheck(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Get main state account data
    const mainInfo = (await rpc("getAccountInfo", [
      MAIN_STATE,
      { encoding: "base64", commitment: "confirmed" },
    ])) as { value: { data: [string, string] } | null };

    if (!mainInfo?.value) throw new Error("Main state account not found");

    const data = Buffer.from(mainInfo.value.data[0], "base64");
    const backingLamports = Number(data.readBigUInt64LE(OFFSET_BACKING_SOL_VALUE));
    const solBacking = backingLamports / 1e9;
    const ticketsLamports = Number(data.readBigUInt64LE(OFFSET_OUTSTANDING_TICKETS));
    const outstandingTickets = ticketsLamports / 1e9;
    const withdrawFeeBp = data.readUInt16LE(OFFSET_WITHDRAW_FEE_BP);
    const waitingHours = data.readUInt16LE(OFFSET_WAITING_HOURS);

    // Get mpSOL supply
    const mintInfo = (await rpc("getAccountInfo", [
      MPSOL_MINT,
      { encoding: "jsonParsed", commitment: "confirmed" },
    ])) as { value: { data: { parsed: { info: { supply: string; decimals: number } } } } };

    const supply = parseInt(mintInfo.value.data.parsed.info.supply);
    const decimals = mintInfo.value.data.parsed.info.decimals;
    const mpsolSupply = supply / Math.pow(10, decimals);

    const ratio = solBacking > 0 ? mpsolSupply / solBacking : 0;
    const inverseRatio = ratio > 0 ? 1 / ratio : 0;

    // Sanity checks
    if (mpsolSupply <= 0) throw new Error("mpSOL supply is zero");
    if (solBacking <= 0) throw new Error("Backing SOL is zero");
    if (ratio < 0.1 || ratio > 10) throw new Error(`Ratio out of range: ${ratio.toFixed(4)}`);

    return {
      name: "pool_state_check",
      status: "PASS",
      durationMs: Date.now() - start,
      details: {
        "mpSOL supply": `${mpsolSupply.toFixed(2)} mpSOL`,
        "Backing SOL": `${solBacking.toFixed(2)} SOL`,
        "Ratio": `1 mpSOL = ${inverseRatio.toFixed(4)} SOL`,
        "Withdraw fee": `${withdrawFeeBp} bp (${(withdrawFeeBp / 100).toFixed(2)}%)`,
        "Outstanding tickets": `${outstandingTickets.toFixed(2)} SOL`,
        "Unstake wait": `${waitingHours}h`,
      },
    };
  } catch (err: unknown) {
    return {
      name: "pool_state_check",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─────────────────────────────────────────────
// Test 2: Price Peg Check (on-chain vs Jupiter)
// ─────────────────────────────────────────────
export async function pricePegCheck(): Promise<TestResult> {
  const start = Date.now();
  const MAX_DEVIATION = 5.0; // 5%

  try {
    // On-chain ratio
    const stateResult = await poolStateCheck();
    const ratioStr = stateResult.details?.["Ratio"];
    const onChainPrice = ratioStr
      ? parseFloat(String(ratioStr).replace("1 mpSOL = ", "").replace(" SOL", ""))
      : 0;

    if (onChainPrice <= 0) throw new Error("Could not read on-chain ratio");

    // Jupiter swap quote: 1 mpSOL → SOL
    const quoteRes = await fetch(
      `https://api.jup.ag/swap/v1/quote?inputMint=${MPSOL_MINT}&outputMint=${SOL_MINT}&amount=1000000000&slippageBps=100`
    );
    const quote = await quoteRes.json();
    const jupiterPrice = quote.outAmount ? parseInt(quote.outAmount) / 1e9 : 0;

    if (jupiterPrice <= 0) {
      return {
        name: "price_peg_check",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: "Jupiter price unavailable",
      };
    }

    const deviation = Math.abs(jupiterPrice - onChainPrice) / onChainPrice * 100;

    return {
      name: "price_peg_check",
      status: deviation <= MAX_DEVIATION ? "PASS" : "FAIL",
      durationMs: Date.now() - start,
      details: {
        "On-chain": `${onChainPrice.toFixed(6)} SOL`,
        "Jupiter": `${jupiterPrice.toFixed(6)} SOL`,
        "Deviation": `${deviation.toFixed(3)}%`,
        "Threshold": `${MAX_DEVIATION}%`,
      },
      ...(deviation > MAX_DEVIATION ? { error: `Deviation ${deviation.toFixed(2)}% exceeds ${MAX_DEVIATION}%` } : {}),
    };
  } catch (err: unknown) {
    return {
      name: "price_peg_check",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─────────────────────────────────────────────
// Test 3: Vault Status Check (deposits enabled?)
// ─────────────────────────────────────────────
export async function vaultStatusCheck(): Promise<TestResult> {
  const start = Date.now();
  const vaults = [
    { name: "jitoSOL", mint: JITOSOL_MINT },
    { name: "mSOL", mint: MSOL_MINT },
    { name: "bSOL", mint: BSOL_MINT },
  ];

  try {
    const details: Record<string, string | number> = {};
    let allOk = true;

    for (const v of vaults) {
      // Derive vault PDA: seeds = [main_state, lst_mint]
      // We can't do PDA derivation in pure browser without web3.js,
      // so we use getTokenAccountsByOwner to check if vault has tokens
      const tokensResult = (await rpc("getTokenAccountsByOwner", [
        MAIN_STATE,
        { mint: v.mint },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ])) as { value: Array<{ account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }> };

      // Also check via getProgramAccounts for the vault PDA
      const programAccounts = (await rpc("getProgramAccounts", [
        MPSOL_PROGRAM,
        {
          encoding: "base64",
          commitment: "confirmed",
          filters: [
            { dataSize: 113 }, // SecondaryVaultState size: 8 discriminator + 105 fields
            { memcmp: { offset: 8, bytes: v.mint } }, // lst_mint at offset 8
          ],
        },
      ])) as Array<{ pubkey: string; account: { data: [string, string] } }>;

      if (programAccounts.length > 0) {
        const vaultData = Buffer.from(programAccounts[0].account.data[0], "base64");
        const totalLst = Number(vaultData.readBigUInt64LE(48)) / 1e9; // vault_total_lst_amount
        const locallyStored = Number(vaultData.readBigUInt64LE(56)) / 1e9;
        const depositsDisabled = vaultData[80] !== 0;

        details[v.name] = `${totalLst.toFixed(2)} total | deposits ${depositsDisabled ? "DISABLED" : "enabled"}`;
        if (depositsDisabled) allOk = false;
      } else {
        details[v.name] = "vault not found";
      }
    }

    return {
      name: "vault_status_check",
      status: allOk ? "PASS" : "FAIL",
      durationMs: Date.now() - start,
      details,
      ...(!allOk ? { error: "One or more vaults have deposits disabled" } : {}),
    };
  } catch (err: unknown) {
    return {
      name: "vault_status_check",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─────────────────────────────────────────────
// Test 4: Wallet Balance Check
// ─────────────────────────────────────────────
export async function walletBalanceCheck(walletAddress: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const balResult = (await rpc("getBalance", [
      walletAddress,
      { commitment: "confirmed" },
    ])) as { value: number };

    const sol = balResult.value / 1e9;

    // Check token balances
    const tokenResult = (await rpc("getTokenAccountsByOwner", [
      walletAddress,
      { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ])) as { value: Array<{ account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number; uiAmountString: string } } } } } }> };

    const tokens: Record<string, number> = {};
    const knownMints: Record<string, string> = {
      [JITOSOL_MINT]: "jitoSOL",
      [MSOL_MINT]: "mSOL",
      [BSOL_MINT]: "bSOL",
      [MPSOL_MINT]: "mpSOL",
    };

    for (const acc of tokenResult.value) {
      const mint = acc.account.data.parsed.info.mint;
      const name = knownMints[mint];
      if (name) {
        tokens[name] = acc.account.data.parsed.info.tokenAmount.uiAmount;
      }
    }

    const details: Record<string, string | number> = {
      "SOL": `${sol.toFixed(5)}`,
    };
    for (const [name, amount] of Object.entries(tokens)) {
      details[name] = `${amount.toFixed(5)}`;
    }

    return {
      name: "wallet_balance_check",
      status: sol > 0 ? "PASS" : "FAIL",
      durationMs: Date.now() - start,
      details,
      ...(sol <= 0 ? { error: "Wallet has 0 SOL" } : {}),
    };
  } catch (err: unknown) {
    return {
      name: "wallet_balance_check",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─────────────────────────────────────────────
// Test 5: URL Accessibility Check
// ─────────────────────────────────────────────
export async function urlAccessCheck(url: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // We can't fetch cross-origin pages directly, but we can check if the URL is valid
    // and use a simple HEAD-like approach or just validate the URL format
    new URL(url);

    // Try fetching with no-cors (we won't get the body but we can check if it doesn't throw)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      await fetch(url, { mode: "no-cors", signal: controller.signal });
      clearTimeout(timeout);
    } catch {
      clearTimeout(timeout);
      return {
        name: "url_access_check",
        status: "FAIL",
        durationMs: Date.now() - start,
        error: `URL not reachable: ${url}`,
        details: { "URL": url },
      };
    }

    return {
      name: "url_access_check",
      status: "PASS",
      durationMs: Date.now() - start,
      details: { "URL": url, "Status": "Reachable" },
    };
  } catch (err: unknown) {
    return {
      name: "url_access_check",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Invalid URL",
    };
  }
}

// ─────────────────────────────────────────────
// Run all tests
// ─────────────────────────────────────────────
export interface RealTestCallbacks {
  onStepStart: (name: string) => void;
  onStepDone: (result: TestResult) => void;
}

export async function runAllTests(
  url: string,
  walletAddress: string,
  callbacks: RealTestCallbacks,
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const tests = [
    { name: "url_access_check", fn: () => urlAccessCheck(url) },
    { name: "wallet_balance_check", fn: () => walletBalanceCheck(walletAddress) },
    { name: "pool_state_check", fn: () => poolStateCheck() },
    { name: "price_peg_check", fn: () => pricePegCheck() },
    { name: "vault_status_check", fn: () => vaultStatusCheck() },
  ];

  for (const test of tests) {
    callbacks.onStepStart(test.name);
    const result = await test.fn();
    results.push(result);
    callbacks.onStepDone(result);
  }

  return results;
}
