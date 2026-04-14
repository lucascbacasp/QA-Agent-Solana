"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchSOLBalance, fetchTokenBalance } from "@/lib/solana";
import { TOKENS } from "@/lib/constants";

interface Balances {
  SOL: number | null;
  jitoSOL: number | null;
  mpSOL: number | null;
}

const EMPTY: Balances = { SOL: null, jitoSOL: null, mpSOL: null };

export function useBalances(
  walletAddress: string,
  refreshTrigger = 0,
  pollIntervalMs = 30000,
) {
  const [balances, setBalances] = useState<Balances>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(async (addr: string) => {
    if (!addr) return;
    try {
      setError(null);
      const [sol, jito, mpsol] = await Promise.all([
        fetchSOLBalance(addr),
        fetchTokenBalance(addr, TOKENS[1].mint!),
        fetchTokenBalance(addr, TOKENS[2].mint!),
      ]);
      setBalances({ SOL: sol, jitoSOL: jito, mpSOL: mpsol });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset + fetch when wallet address changes
  useEffect(() => {
    setLoading(true);
    setBalances(EMPTY);
    setError(null);
    doFetch(walletAddress);
    const interval = setInterval(() => doFetch(walletAddress), pollIntervalMs);
    return () => clearInterval(interval);
  }, [walletAddress, doFetch, pollIntervalMs]);

  // Refetch on external trigger (test complete, manual refresh)
  useEffect(() => {
    if (refreshTrigger > 0) {
      doFetch(walletAddress);
    }
  }, [refreshTrigger, walletAddress, doFetch]);

  const refetch = useCallback(() => doFetch(walletAddress), [doFetch, walletAddress]);

  return { balances, loading, error, refetch };
}
