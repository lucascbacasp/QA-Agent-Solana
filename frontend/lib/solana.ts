import { HELIUS_RPC_URL } from "./constants";

/**
 * Direct RPC calls without @solana/web3.js to avoid bundling issues.
 * Uses raw JSON-RPC fetch for browser compatibility.
 */

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(HELIUS_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export async function fetchSOLBalance(walletAddress: string): Promise<number> {
  const result = (await rpcCall("getBalance", [walletAddress])) as { value: number };
  return result.value / 1e9;
}

export async function fetchTokenBalance(
  walletAddress: string,
  mintAddress: string,
): Promise<number> {
  const result = (await rpcCall("getTokenAccountsByOwner", [
    walletAddress,
    { mint: mintAddress },
    { encoding: "jsonParsed" },
  ])) as { value: Array<{ account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }> };

  if (result.value.length === 0) return 0;
  return result.value[0].account.data.parsed.info.tokenAmount.uiAmount;
}
