import { NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createHash } from "crypto";

// Protocol constants
const MPSOL_PROGRAM_ID = new PublicKey("MPSoLoEnfNRFReRZSVH2V8AffSmWSR4dVoBLFm1YpAW");
const MPSOL_MINT = new PublicKey("mPsoLV53uAGXnPJw63W91t2VDqCVZcU5rTh3PWzxnLr");
const MAIN_STATE = new PublicKey("mpsoLeuCF3LwrJWbzxNd81xRafePFfPhsNvGsAMhUAA");
const JITOSOL_MINT = new PublicKey("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn");
const JITO_POOL_STATE = new PublicKey("Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb");

// Spend limits
const MAX_STAKE_AMOUNT = 0.003;   // jitoSOL
const MAX_UNSTAKE_AMOUNT = 0.003; // mpSOL

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "ERROR" | "SKIP";
  durationMs: number;
  details?: Record<string, string | number>;
  txSignature?: string;
  error?: string;
}

function getWallet(): Keypair {
  const raw = process.env.QA_WALLET_PRIVATE_KEY;
  if (!raw) throw new Error("QA_WALLET_PRIVATE_KEY not configured");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

function getConnection(): Connection {
  const rpc = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || process.env.HELIUS_RPC_URL || "";
  if (!rpc) throw new Error("RPC URL not configured");
  return new Connection(rpc, "confirmed");
}

// ─────────────────────────────────────────────
// Stake jitoSOL → mpSOL
// ─────────────────────────────────────────────
async function stakeTest(): Promise<TestResult> {
  const start = Date.now();
  try {
    const wallet = getWallet();
    const conn = getConnection();

    // Check jitoSOL balance
    const jitoAta = getAssociatedTokenAddressSync(JITOSOL_MINT, wallet.publicKey);
    const jitoInfo = await conn.getParsedAccountInfo(jitoAta);
    let jitoBalance = 0;
    if (jitoInfo.value?.data && "parsed" in jitoInfo.value.data) {
      jitoBalance = parseFloat(jitoInfo.value.data.parsed.info.tokenAmount.uiAmountString);
    }

    if (jitoBalance < MAX_STAKE_AMOUNT) {
      return {
        name: "stake_jitosol",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: `Insufficient jitoSOL: ${jitoBalance.toFixed(6)} (need ${MAX_STAKE_AMOUNT})`,
      };
    }

    // Derive PDAs
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [MAIN_STATE.toBuffer(), JITOSOL_MINT.toBuffer()],
      MPSOL_PROGRAM_ID,
    );
    const [vaultsAtaPdaAuth] = PublicKey.findProgramAddressSync(
      [MAIN_STATE.toBuffer(), Buffer.from("vaults-ata-auth")],
      MPSOL_PROGRAM_ID,
    );
    const vaultLstAccount = getAssociatedTokenAddressSync(JITOSOL_MINT, vaultsAtaPdaAuth, true);
    const [mpsolMintAuth] = PublicKey.findProgramAddressSync(
      [MAIN_STATE.toBuffer(), Buffer.from("main-mint")],
      MPSOL_PROGRAM_ID,
    );
    const mpsolAta = getAssociatedTokenAddressSync(MPSOL_MINT, wallet.publicKey);

    // Check mpSOL balance before
    let mpsolBefore = 0;
    try {
      const info = await conn.getParsedAccountInfo(mpsolAta);
      if (info.value?.data && "parsed" in info.value.data) {
        mpsolBefore = parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
      }
    } catch {}

    // Build stake instruction
    const discriminator = createHash("sha256").update("global:stake").digest().subarray(0, 8);
    const lstAmount = BigInt(Math.floor(MAX_STAKE_AMOUNT * 1e9));
    const argsBuf = Buffer.alloc(12);
    argsBuf.writeBigUInt64LE(lstAmount, 0);
    argsBuf.writeUInt32LE(0, 8); // ref_code = 0
    const data = Buffer.concat([discriminator, argsBuf]);

    const ix = new TransactionInstruction({
      programId: MPSOL_PROGRAM_ID,
      keys: [
        { pubkey: MAIN_STATE, isSigner: false, isWritable: true },
        { pubkey: JITOSOL_MINT, isSigner: false, isWritable: false },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: vaultsAtaPdaAuth, isSigner: false, isWritable: false },
        { pubkey: vaultLstAccount, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: jitoAta, isSigner: false, isWritable: true },
        { pubkey: MPSOL_MINT, isSigner: false, isWritable: true },
        { pubkey: mpsolMintAuth, isSigner: false, isWritable: false },
        { pubkey: mpsolAta, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: JITO_POOL_STATE, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, mpsolAta, wallet.publicKey, MPSOL_MINT,
      ),
      ix,
    );

    const signature = await sendAndConfirmTransaction(conn, tx, [wallet], {
      commitment: "confirmed",
      maxRetries: 3,
    });

    // Check mpSOL balance after
    await new Promise((r) => setTimeout(r, 2000));
    let mpsolAfter = mpsolBefore;
    try {
      const info = await conn.getParsedAccountInfo(mpsolAta);
      if (info.value?.data && "parsed" in info.value.data) {
        mpsolAfter = parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
      }
    } catch {}

    const mpsolReceived = mpsolAfter - mpsolBefore;

    return {
      name: "stake_jitosol",
      status: "PASS",
      durationMs: Date.now() - start,
      txSignature: signature,
      details: {
        "jitoSOL staked": MAX_STAKE_AMOUNT.toString(),
        "mpSOL received": mpsolReceived > 0 ? mpsolReceived.toFixed(6) : "pending",
        "TX": `https://explorer.solana.com/tx/${signature}`,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      name: "stake_jitosol",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: msg.length > 200 ? msg.slice(0, 200) + "..." : msg,
    };
  }
}

// ─────────────────────────────────────────────
// Unstake mpSOL → ticket
// ─────────────────────────────────────────────
async function unstakeTest(): Promise<TestResult> {
  const start = Date.now();
  try {
    const wallet = getWallet();
    const conn = getConnection();

    // Check mpSOL balance
    const mpsolAta = getAssociatedTokenAddressSync(MPSOL_MINT, wallet.publicKey);
    let mpsolBalance = 0;
    try {
      const info = await conn.getParsedAccountInfo(mpsolAta);
      if (info.value?.data && "parsed" in info.value.data) {
        mpsolBalance = parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
      }
    } catch {
      return { name: "unstake_mpsol", status: "SKIP", durationMs: Date.now() - start, error: "No mpSOL ATA" };
    }

    if (mpsolBalance < MAX_UNSTAKE_AMOUNT) {
      return {
        name: "unstake_mpsol",
        status: "SKIP",
        durationMs: Date.now() - start,
        error: `Insufficient mpSOL: ${mpsolBalance.toFixed(6)} (need ${MAX_UNSTAKE_AMOUNT})`,
      };
    }

    // Read treasury from main state
    const mainInfo = await conn.getAccountInfo(MAIN_STATE);
    if (!mainInfo) throw new Error("Main state not found");
    const treasuryTag = mainInfo.data[136];
    if (treasuryTag !== 1) throw new Error("Treasury not configured");
    const treasuryMpsolAccount = new PublicKey(mainInfo.data.subarray(137, 169));

    // Generate ticket keypair
    const ticketKeypair = Keypair.generate();

    // Build unstake instruction
    const discriminator = createHash("sha256").update("global:unstake").digest().subarray(0, 8);
    const mpsolAmount = BigInt(Math.floor(MAX_UNSTAKE_AMOUNT * 1e9));
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(mpsolAmount);
    const data = Buffer.concat([discriminator, amountBuf]);

    const ix = new TransactionInstruction({
      programId: MPSOL_PROGRAM_ID,
      keys: [
        { pubkey: MAIN_STATE, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: mpsolAta, isSigner: false, isWritable: true },
        { pubkey: MPSOL_MINT, isSigner: false, isWritable: true },
        { pubkey: treasuryMpsolAccount, isSigner: false, isWritable: true },
        { pubkey: ticketKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(conn, tx, [wallet, ticketKeypair], {
      commitment: "confirmed",
      maxRetries: 3,
    });

    return {
      name: "unstake_mpsol",
      status: "PASS",
      durationMs: Date.now() - start,
      txSignature: signature,
      details: {
        "mpSOL unstaked": MAX_UNSTAKE_AMOUNT.toString(),
        "Ticket": ticketKeypair.publicKey.toBase58(),
        "TX": `https://explorer.solana.com/tx/${signature}`,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      name: "unstake_mpsol",
      status: "ERROR",
      durationMs: Date.now() - start,
      error: msg.length > 200 ? msg.slice(0, 200) + "..." : msg,
    };
  }
}

// ─────────────────────────────────────────────
// API Handler
// ─────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tests } = body as { tests: string[] };

    if (!process.env.QA_WALLET_PRIVATE_KEY) {
      return NextResponse.json({ error: "Server not configured for transactions" }, { status: 500 });
    }

    const results: TestResult[] = [];

    for (const test of tests) {
      if (test === "stake_jitosol") {
        results.push(await stakeTest());
      } else if (test === "unstake_mpsol") {
        results.push(await unstakeTest());
      }
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
