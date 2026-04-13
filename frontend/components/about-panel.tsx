"use client";
import { useState } from "react";
import { QA_WALLET } from "@/lib/constants";

export function AboutPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">About This Agent</h2>
        <span className="text-xs text-zinc-600">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && (
        <div className="space-y-3 text-sm text-zinc-400 animate-slideUp">
          <p className="text-zinc-300 font-medium">
            QA Agent for Meta Pool mpSOL on Solana Mainnet
          </p>

          <div className="space-y-2">
            <div>
              <h3 className="text-xs font-semibold text-teal-400 uppercase">What it does</h3>
              <p>
                Autonomous QA agent that runs real transactions on Solana mainnet to verify
                the mpSOL liquid staking protocol works correctly. Tests include staking LSTs
                (jitoSOL, mSOL), unstaking mpSOL, checking pool state, and verifying price peg
                against Jupiter.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-teal-400 uppercase">How it works</h3>
              <ul className="list-disc list-inside space-y-1 text-zinc-500">
                <li><span className="text-zinc-400">On-chain tests</span> &mdash; Builds and signs real transactions using a dedicated QA keypair with spend limits</li>
                <li><span className="text-zinc-400">UI browser tests</span> &mdash; Injects the QA wallet into any dApp via React fiber patching, then interacts with the UI to stake/unstake</li>
                <li><span className="text-zinc-400">This dashboard</span> &mdash; Reads live balances from Solana mainnet via Helius RPC and displays test execution + reports</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-teal-400 uppercase">QA Wallet</h3>
              <p className="font-mono text-xs text-zinc-500 break-all">{QA_WALLET}</p>
              <p className="text-zinc-600 text-xs mt-1">
                Isolated wallet with limited funds (~0.03 SOL). Never uses your main wallet.
                All transactions are capped at 0.05 SOL per session.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-teal-400 uppercase">Tech Stack</h3>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {["Solana/web3.js", "Anchor IDL", "Next.js", "Helius RPC", "Jupiter API", "Tailwind CSS"].map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs border border-zinc-700/50">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-600">
            <a
              href="https://github.com/lucascbacasp/QA-Agent-Solana"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 transition-colors"
            >
              GitHub Repo &rarr;
            </a>
            <span>Built with Claude Code</span>
          </div>
        </div>
      )}
    </div>
  );
}
