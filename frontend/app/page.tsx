"use client";
import { WalletHeader } from "@/components/wallet-header";
import { BalancePanel } from "@/components/balance-panel";
import { UrlTestForm } from "@/components/url-test-form";
import { TestStepper } from "@/components/test-stepper";
import { ReportHistory } from "@/components/report-history";
import { useTestRunner } from "@/hooks/use-test-runner";

export default function Home() {
  const runner = useTestRunner();

  return (
    <div className="min-h-screen flex flex-col">
      <WalletHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <BalancePanel />
            <ReportHistory newReport={runner.report} />
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <UrlTestForm
              onStart={runner.start}
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
