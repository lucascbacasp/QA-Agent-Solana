"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import type { WalletMode } from "@/hooks/use-active-wallet";

interface Props {
  mode: WalletMode;
  activeAddress: string;
  walletName: string | null;
  connected: boolean;
  onSwitchToQA: () => void;
  onSwitchToConnected: () => void;
  onDisconnect: () => void;
}

export function WalletHeader({
  mode, activeAddress, walletName, connected,
  onSwitchToQA, onSwitchToConnected, onDisconnect,
}: Props) {
  const [copied, setCopied] = useState(false);
  const { setVisible } = useWalletModal();
  const short = `${activeAddress.slice(0, 4)}...${activeAddress.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(activeAddress);
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

      <div className="flex items-center gap-3">
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-zinc-700 overflow-hidden text-xs">
          <button
            onClick={onSwitchToQA}
            className={`px-3 py-1.5 transition-colors ${mode === "qa" ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"}`}
          >
            QA Wallet
          </button>
          <button
            onClick={() => {
              if (connected) {
                onSwitchToConnected();
              } else {
                setVisible(true);
              }
            }}
            className={`px-3 py-1.5 transition-colors ${mode === "connected" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"}`}
          >
            {connected ? walletName || "My Wallet" : "Connect Wallet"}
          </button>
        </div>

        {/* Active address */}
        <button
          onClick={copy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors"
        >
          <span className={`w-2 h-2 rounded-full ${mode === "qa" ? "bg-emerald-400" : "bg-purple-400"} animate-pulse`} />
          <span className="text-sm font-mono text-zinc-300">{short}</span>
          <span className="text-xs text-zinc-500">{copied ? "Copied!" : ""}</span>
        </button>

        {/* Disconnect (only when user wallet is active) */}
        {mode === "connected" && connected && (
          <button
            onClick={onDisconnect}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </header>
  );
}
