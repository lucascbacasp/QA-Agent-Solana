"use client";
import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { QA_WALLET } from "@/lib/constants";

export type WalletMode = "qa" | "connected";

export function useActiveWallet() {
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const [mode, setMode] = useState<WalletMode>("qa");

  const activeAddress = mode === "connected" && connected && publicKey
    ? publicKey.toBase58()
    : QA_WALLET;

  const isUserWallet = mode === "connected" && connected;
  const walletName = wallet?.adapter?.name || null;

  const switchToQA = useCallback(() => {
    setMode("qa");
  }, []);

  const switchToConnected = useCallback(() => {
    setMode("connected");
  }, []);

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
