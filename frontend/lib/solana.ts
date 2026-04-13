import { HELIUS_RPC_URL } from "./constants";

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
  const result = (await rpcCall("getBalance", [
    walletAddress,
    { commitment: "confirmed" },
  ])) as { value: number };
  return result.value / 1e9;
}

export async function fetchTokenBalance(
  walletAddress: string,
  mintAddress: string,
): Promise<number> {
  // Use getTokenAccountsByOwner with proper Helius-compatible params
  const result = (await rpcCall("getTokenAccountsByOwner", [
    walletAddress,
    { mint: mintAddress },
    { encoding: "jsonParsed", commitment: "confirmed" },
  ])) as {
    value: Array<{
      account: {
        data: {
          parsed: {
            info: { tokenAmount: { uiAmount: number } };
          };
        };
      };
    }>;
  };

  if (!result.value || result.value.length === 0) return 0;
  return result.value[0].account.data.parsed.info.tokenAmount.uiAmount;
}
