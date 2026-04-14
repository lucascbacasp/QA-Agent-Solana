"use client";
import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { QA_WALLET } from "@/lib/constants";

export type WalletMode = "qa" | "connected";

export function useActiveWallet() {
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const [mode, setMode] = useState<WalletMode>("qa");

  // Auto-switch to "connected" mode when a wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      setMode("connected");
    }
  }, [connected, publicKey]);

  // Auto-switch back to "qa" when wallet disconnects
  useEffect(() => {
    if (!connected && mode === "connected") {
      setMode("qa");
    }
  }, [connected, mode]);

  const activeAddress = mode === "connected" && connected && publicKey
    ? publicKey.toBase58()
    : QA_WALLET;

  const isUserWallet = mode === "connected" && connected;
  const walletName = wallet?.adapter?.name || null;

  const switchToQA = useCallback(() => {
    setMode("qa");
  }, []);

  const switchToConnected = useCallback(() => {
    if (connected) setMode("connected");
  }, [connected]);

  const disconnectWallet = useCallback(async () => {
    await disconnect();
    setMode("qa");
  }, [disconnect]);

  return {
    mode,
    activeAddress,
    isUserWallet,
    walletName,
    connected,
    switchToQA,
    switchToConnected,
    disconnectWallet,
  };
}
