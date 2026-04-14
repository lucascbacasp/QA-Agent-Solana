"use client";
import { useBalances } from "@/hooks/use-balances";
import { TOKENS } from "@/lib/constants";
import type { WalletMode } from "@/hooks/use-active-wallet";

interface Props {
  walletAddress: string;
  mode: WalletMode;
  refreshTrigger?: number;
}

export function BalancePanel({ walletAddress, mode, refreshTrigger = 0 }: Props) {
  const { balances, loading, error, refetch } = useBalances(walletAddress, refreshTrigger);
  const balanceMap: Record<string, number | null> = {
    SOL: balances.SOL,
    jitoSOL: balances.jitoSOL,
    mpSOL: balances.mpSOL,
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Wallet Balances</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="text-xs text-zinc-600 hover:text-teal-400 transition-colors"
            title="Refresh balances"
          >
            Refresh
          </button>
          <span className={`text-xs px-2 py-0.5 rounded-full ${mode === "qa" ? "bg-teal-500/10 text-teal-400" : "bg-purple-500/10 text-purple-400"}`}>
            {mode === "qa" ? "QA Wallet" : "Your Wallet"} &middot; {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </span>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">{error}</p>
      )}
      <div className="grid grid-cols-3 gap-3">
        {TOKENS.map((token) => {
          const bal = balanceMap[token.symbol];
          return (
            <div
              key={token.symbol}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1"
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: token.color }} />
                <span className="text-xs font-medium text-zinc-400">{token.symbol}</span>
              </div>
              {loading || bal === null ? (
                <div className="h-7 w-20 rounded bg-zinc-800 animate-pulse" />
              ) : (
                <p className="text-xl font-semibold text-zinc-100 tabular-nums">
                  {bal.toFixed(5)}
                </p>
              )}
              <p className="text-xs text-zinc-600">{token.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
