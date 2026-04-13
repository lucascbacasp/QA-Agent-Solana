/**
 * UI Stake Test — Browser-based E2E testing of Solana staking dApps.
 *
 * This module provides helpers for Claude's browser MCP tools to:
 * 1. Prepare injection scripts for the QA wallet
 * 2. Read pre/post balances for verification
 * 3. Generate test reports
 *
 * TESTED FLOW (proven on sol.metapool.app):
 * ┌─────────────────────────────────────────────────────────────┐
 * │  1. Navigate to app URL                                     │
 * │  2. Execute Step 1 script (inject window.solana)            │
 * │  3. Wait for app to hydrate (~3-4s)                         │
 * │  4. Execute Step 2+3 script (CDN + patch adapter + connect) │
 * │  5. Wait for connection (~5s)                               │
 * │  6. Verify wallet address shows in UI header                │
 * │  7. Verify token balances display correctly                 │
 * │  8. Click action button (Upgrade/Stake/Unstake)             │
 * │  9. Wait for TX confirmation (~10s)                         │
 * │ 10. Verify balances updated in UI                           │
 * │ 11. Cross-check balances on-chain                           │
 * └─────────────────────────────────────────────────────────────┘
 */

import {
  buildStep1InjectWindowSolana,
  buildStep2PatchAndConnect,
  buildFullInjectionScript,
  type WalletInjectorConfig,
} from "./wallet-injector.js";
import { getWallet, getBalanceSOL } from "../core/wallet.js";
import { getConnection } from "../core/connection.js";
import { CONFIG } from "../core/config.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { KNOWN_LSTS } from "../core/known-lsts.js";
import type { TestResult } from "../core/types.js";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface UITestConfig {
  /** The URL of the staking app to test */
  appUrl: string;
  /** Description for the test report */
  description?: string;
}

export interface UITestContext {
  /** Script for Step 1: inject window.solana (run immediately after navigation) */
  step1Script: string;
  /** Script for Step 2+3: patch adapter + connect (run after app hydrates) */
  step2Script: string;
  /** Full combined script (alternative to step-by-step) */
  fullScript: string;
  /** QA wallet public key */
  publicKey: string;
  /** Shortened public key as shown in most UIs */
  publicKeyShort: string;
  /** Balances before the test */
  preBalances: TokenBalances;
}

export interface TokenBalances {
  sol: number;
  jitoSOL: number;
  mpSOL: number;
}

export interface UITestReport {
  appUrl: string;
  description: string;
  publicKey: string;
  preBalances: TokenBalances;
  postBalances: TokenBalances;
  changes: {
    sol: number;
    jitoSOL: number;
    mpSOL: number;
  };
  txSignature?: string;
  status: "PASS" | "FAIL" | "ERROR";
  error?: string;
  timestamp: string;
}

// ─────────────────────────────────────────────
// Prepare
// ─────────────────────────────────────────────

/**
 * Prepares the UI test context — generates injection scripts and reads pre-balances.
 */
export async function prepareUITest(config: UITestConfig): Promise<UITestContext> {
  const wallet = getWallet();
  const pubkey = wallet.publicKey.toBase58();

  const injectorConfig: WalletInjectorConfig = {
    publicKeyBase58: pubkey,
    secretKeyArray: Array.from(wallet.secretKey),
  };

  const balances = await readBalances();

  return {
    step1Script: buildStep1InjectWindowSolana(injectorConfig),
    step2Script: buildStep2PatchAndConnect(injectorConfig),
    fullScript: buildFullInjectionScript(injectorConfig),
    publicKey: pubkey,
    publicKeyShort: `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`,
    preBalances: balances,
  };
}

// ─────────────────────────────────────────────
// Balance reading
// ─────────────────────────────────────────────

/**
 * Reads current on-chain balances for the QA wallet.
 */
export async function readBalances(): Promise<TokenBalances> {
  const wallet = getWallet();
  const conn = getConnection();

  const sol = await getBalanceSOL();

  const jito = KNOWN_LSTS.find((l) => l.name === "jitoSOL")!;
  let jitoSOL = 0;
  try {
    const ata = getAssociatedTokenAddressSync(jito.mint, wallet.publicKey);
    const info = await conn.getParsedAccountInfo(ata);
    if (info.value?.data && "parsed" in info.value.data) {
      jitoSOL = parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
    }
  } catch {}

  let mpSOL = 0;
  try {
    const ata = getAssociatedTokenAddressSync(CONFIG.MPSOL_MINT, wallet.publicKey);
    const info = await conn.getParsedAccountInfo(ata);
    if (info.value?.data && "parsed" in info.value.data) {
      mpSOL = parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
    }
  } catch {}

  return { sol, jitoSOL, mpSOL };
}

// ─────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────

/**
 * Generates a UI test report by comparing pre and post balances.
 */
export async function generateUITestReport(
  config: UITestConfig,
  preBalances: TokenBalances,
  txSignature?: string,
  error?: string,
): Promise<UITestReport> {
  const wallet = getWallet();
  const postBalances = await readBalances();

  const changes = {
    sol: postBalances.sol - preBalances.sol,
    jitoSOL: postBalances.jitoSOL - preBalances.jitoSOL,
    mpSOL: postBalances.mpSOL - preBalances.mpSOL,
  };

  let status: "PASS" | "FAIL" | "ERROR" = "PASS";
  if (error) {
    status = "ERROR";
  } else if (changes.mpSOL <= 0 && changes.jitoSOL >= 0) {
    // Expected: jitoSOL decreases, mpSOL increases for a stake
    status = "FAIL";
  }

  return {
    appUrl: config.appUrl,
    description: config.description || "UI Stake Test",
    publicKey: wallet.publicKey.toBase58(),
    preBalances,
    postBalances,
    changes,
    txSignature,
    status,
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Prints a UI test report to console.
 */
export function printUITestReport(report: UITestReport): void {
  const line = "=".repeat(54);
  const dash = "-".repeat(54);

  console.log(`\n${line}`);
  console.log("         UI TEST REPORT — mpSOL QA");
  console.log(line);
  console.log(`  App:      ${report.appUrl}`);
  console.log(`  Test:     ${report.description}`);
  console.log(`  Wallet:   ${report.publicKey}`);
  console.log(`  Status:   ${report.status}`);
  console.log(`  Time:     ${report.timestamp}`);
  if (report.txSignature) {
    console.log(`  TX:       https://explorer.solana.com/tx/${report.txSignature}`);
  }
  if (report.error) {
    console.log(`  Error:    ${report.error}`);
  }
  console.log(dash);
  console.log("  BALANCES:");
  console.log(`                  Before        After        Change`);
  console.log(`  SOL        ${fmt(report.preBalances.sol)}   ${fmt(report.postBalances.sol)}   ${fmtChange(report.changes.sol)}`);
  console.log(`  jitoSOL    ${fmt(report.preBalances.jitoSOL)}   ${fmt(report.postBalances.jitoSOL)}   ${fmtChange(report.changes.jitoSOL)}`);
  console.log(`  mpSOL      ${fmt(report.preBalances.mpSOL)}   ${fmt(report.postBalances.mpSOL)}   ${fmtChange(report.changes.mpSOL)}`);
  console.log(line);
}

function fmt(n: number): string {
  return n.toFixed(5).padStart(10);
}

function fmtChange(n: number): string {
  const prefix = n >= 0 ? "+" : "";
  return (prefix + n.toFixed(5)).padStart(10);
}
