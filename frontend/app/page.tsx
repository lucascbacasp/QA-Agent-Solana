"use client";
import { useState, useEffect } from "react";
import { WalletHeader } from "@/components/wallet-header";
import { BalancePanel } from "@/components/balance-panel";
import { UrlTestForm } from "@/components/url-test-form";
import { TestStepper } from "@/components/test-stepper";
import { ReportHistory } from "@/components/report-history";
import { AboutPanel } from "@/components/about-panel";
import { useTestRunner } from "@/hooks/use-test-runner";
import { useActiveWallet } from "@/hooks/use-active-wallet";

export default function Home() {
  const runner = useTestRunner();
  const wallet = useActiveWallet();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refresh balances when test completes
  useEffect(() => {
    if (runner.status === "done" || runner.status === "failed") {
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [runner.status]);

  const handleStart = (url: string) => {
    runner.start(url, wallet.activeAddress);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <WalletHeader
        mode={wallet.mode}
        activeAddress={wallet.activeAddress}
        walletName={wallet.walletName}
        connected={wallet.connected}
        onSwitchToQA={wallet.switchToQA}
        onSwitchToConnected={wallet.switchToConnected}
        onDisconnect={wallet.disconnectWallet}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <BalancePanel
              walletAddress={wallet.activeAddress}
              mode={wallet.mode}
              refreshTrigger={refreshTrigger}
            />
            <ReportHistory newReport={runner.report} />
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <AboutPanel />
            <UrlTestForm
              onStart={handleStart}
              onReset={runner.reset}
              isRunning={runner.status === "running"}
              isDone={runner.status === "done" || runner.status === "failed"}
            />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <TestStepper
                steps={runner.steps}
                progress={runner.progress}
                status={runner.status}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-zinc-700">
        Meta Pool mpSOL QA Agent &middot; Solana Mainnet
      </footer>
    </div>
  );
}
