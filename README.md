# Meta Pool mpSOL — QA Agent

Autonomous QA agent that executes real tests on Solana mainnet against the mpSOL liquid staking protocol by Meta Pool.

**Live Dashboard**: [mpsol-qa.vercel.app](https://mpsol-qa.vercel.app)

**Repo**: [github.com/lucascbacasp/QA-Agent-Solana](https://github.com/lucascbacasp/QA-Agent-Solana)

## What it does

- **On-chain tests** — Builds and signs real transactions (stake, unstake, round-trip) using a dedicated QA wallet with spend limits
- **Browser UI tests** — Injects the QA wallet into any Solana dApp via React fiber patching, then interacts with the UI (connect wallet, verify balances, execute stake, confirm TX)
- **Dashboard** — Next.js frontend showing live balances, animated test execution, and report history. Supports connecting your own wallet (Phantom, Solflare)

## Architecture

```
QA Agent Solana/
├── src/                    # Backend QA agent (Node.js/TypeScript)
│   ├── core/               # Config, wallet, RPC, spend tracker, pool reader
│   ├── tests/              # On-chain test modules
│   │   ├── pool-state-check.ts    # TVL, ratio, supply, paused check
│   │   ├── price-peg-check.ts     # On-chain vs Jupiter price deviation
│   │   ├── stake-sol.ts           # Stake LST → mpSOL
│   │   ├── stake-lst-jitosol.ts   # Dedicated jitoSOL stake test
│   │   ├── unstake-mpsol.ts       # Unstake mpSOL → ticket
│   │   └── round-trip.ts          # Full stake + unstake cycle
│   ├── ui-tests/           # Browser injection modules
│   │   ├── wallet-injector.ts     # Phantom mock + React fiber patching
│   │   └── ui-stake-test.ts       # UI test flow + balance verification
│   └── scripts/            # CLI tools
│       ├── check-state.ts         # Inspect pool state
│       ├── fetch-idl.ts           # Download program IDL
│       ├── swap-sol-to-lst.ts     # Swap SOL → jitoSOL via Jupiter
│       └── ui-test.ts             # Generate wallet injection scripts
├── frontend/               # Next.js dashboard (deployed on Vercel)
│   ├── components/         # UI components
│   ├── hooks/              # useBalances, useTestRunner, useActiveWallet
│   └── lib/                # Solana RPC, types, constants
├── idl/                    # Anchor IDL (fetched from Meta Pool repo)
└── .github/workflows/      # CI/CD (every 6 hours)
```

## Protocol Addresses

| Component | Address |
|---|---|
| mpSOL Program | `MPSoLoEnfNRFReRZSVH2V8AffSmWSR4dVoBLFm1YpAW` |
| mpSOL Mint | `mPsoLV53uAGXnPJw63W91t2VDqCVZcU5rTh3PWzxnLr` |
| Main State | `mpsoLeuCF3LwrJWbzxNd81xRafePFfPhsNvGsAMhUAA` |
| QA Wallet | `GxQYMQTMKYFWHUbgWhaBjsBxtZCiLA8t3JLQaceab6b5` |

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your Helius RPC key and QA wallet keypair
```

### 3. Inspect pool state

```bash
npm run check-state
```

### 4. Run QA tests

```bash
npm run dev          # Real transactions on mainnet
DRY_RUN=true npm run dev  # Simulate without spending SOL
```

### 5. Run the dashboard

```bash
cd frontend && npm install && npm run dev
# Open http://localhost:3000
```

## Test Results (Mainnet)

| Test | Status | Details |
|---|---|---|
| pool_state_check | PASS | TVL: 1,777 SOL, Ratio: 1 mpSOL = 1.162 SOL |
| price_peg_check | PASS | 2.34% deviation (on-chain vs Jupiter) |
| stake_sol | PASS | jitoSOL → mpSOL, confirmed on-chain |
| stake_lst_jitoSOL | PASS | Dedicated jitoSOL vault test |
| unstake_mpsol | PASS | Ticket created, 240h waiting period |
| round_trip | PASS | Full stake + unstake cycle |
| UI: wallet connect | PASS | Injected into sol.metapool.app |
| UI: stake via button | PASS | Clicked "Upgrade", TX confirmed |

## Dashboard Features

- **Live balances** — SOL, jitoSOL, mpSOL from Solana mainnet via Helius RPC
- **Wallet switching** — Toggle between QA wallet and your own wallet (Phantom/Solflare)
- **Test runner** — Animated 10-step test execution with progress bar
- **Report history** — Stored in localStorage with PASS/FAIL checklist
- **About panel** — Collapsible explanation of the agent

## Safety Mechanisms

- **Isolated wallet** — Dedicated QA keypair, never your main wallet
- **Spend limits** — 0.05 SOL per session, 0.015 SOL per test
- **Balance guard** — Checks funds before every transaction
- **Dry-run mode** — `DRY_RUN=true` simulates without sending transactions

## Browser UI Test (How it works)

The agent injects a fake Phantom wallet into any Solana dApp by:

1. Overriding `window.solana` with a Phantom-compatible mock
2. Loading `@solana/web3.js` + `tweetnacl` from CDN
3. Patching the React wallet adapter via fiber tree introspection
4. Setting `adapter._wallet`, `_connected`, `_publicKey` with real PublicKey
5. Overriding `sendTransaction` on adapter + prototype to sign with the QA keypair
6. Handling both legacy and versioned transactions

```bash
npm run ui-test https://sol.metapool.app/  # Generate injection scripts
```

## Tech Stack

- **Solana/web3.js** + **Anchor IDL** — On-chain interactions
- **Next.js 16** + **Tailwind CSS** — Dashboard frontend
- **Helius RPC** — Reliable mainnet access
- **Jupiter API** — Price feeds + token swaps
- **Vercel** — Dashboard hosting
- **GitHub Actions** — CI/CD every 6 hours

## Deploy

Dashboard is deployed at [mpsol-qa.vercel.app](https://mpsol-qa.vercel.app).

To redeploy:
```bash
cd frontend && vercel --prod
```

---

Built with [Claude Code](https://claude.ai/code)
