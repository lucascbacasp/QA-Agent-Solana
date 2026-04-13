"use client";
import { useState } from "react";
import { QA_WALLET } from "@/lib/constants";

export function WalletHeader() {
  const [copied, setCopied] = useState(false);
  const short = `${QA_WALLET.slice(0, 4)}...${QA_WALLET.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(QA_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-sm font-bold text-zinc-900">
          M
        </div>
        <span className="text-lg font-semibold text-zinc-100">mpSOL QA Agent</span>
      </div>
      <button
        onClick={copy}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-sm font-mono text-zinc-300">{short}</span>
        <span className="text-xs text-zinc-500">{copied ? "Copied!" : "Copy"}</span>
      </button>
    </header>
  );
}
