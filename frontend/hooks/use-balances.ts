"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchSOLBalance, fetchTokenBalance } from "@/lib/solana";
import { QA_WALLET, TOKENS } from "@/lib/constants";

interface Balances {
  SOL: number | null;
  jitoSOL: number | null;
  mpSOL: number | null;
}

export function useBalances(pollIntervalMs = 30000) {
  const [balances, setBalances] = useState<Balances>({ SOL: null, jitoSOL: null, mpSOL: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const [sol, jito, mpsol] = await Promise.all([
        fetchSOLBalance(QA_WALLET),
        fetchTokenBalance(QA_WALLET, TOKENS[1].mint!),
        fetchTokenBalance(QA_WALLET, TOKENS[2].mint!),
      ]);
      setBalances({ SOL: sol, jitoSOL: jito, mpSOL: mpsol });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refetch, pollIntervalMs]);

  return { balances, loading, error, refetch };
}
