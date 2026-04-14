"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchSOLBalance, fetchTokenBalance } from "@/lib/solana";
import { TOKENS } from "@/lib/constants";

interface Balances {
  SOL: number | null;
  jitoSOL: number | null;
  mpSOL: number | null;
}

export function useBalances(
  walletAddress: string,
  refreshTrigger = 0,
  pollIntervalMs = 30000,
) {
  const [balances, setBalances] = useState<Balances>({ SOL: null, jitoSOL: null, mpSOL: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevAddress = useRef(walletAddress);

  const refetch = useCallback(async () => {
    if (!walletAddress) return;
    try {
      setError(null);
      const [sol, jito, mpsol] = await Promise.all([
        fetchSOLBalance(walletAddress),
        fetchTokenBalance(walletAddress, TOKENS[1].mint!),
        fetchTokenBalance(walletAddress, TOKENS[2].mint!),
      ]);
      setBalances({ SOL: sol, jitoSOL: jito, mpSOL: mpsol });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  // Reset and refetch when wallet address changes
  useEffect(() => {
    if (walletAddress !== prevAddress.current) {
      prevAddress.current = walletAddress;
      setLoading(true);
      setBalances({ SOL: null, jitoSOL: null, mpSOL: null });
    }
    refetch();
    const interval = setInterval(refetch, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refetch, pollIntervalMs, walletAddress]);

  // Refetch when external trigger changes (e.g., test runner completes)
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  return { balances, loading, error, refetch };
}
