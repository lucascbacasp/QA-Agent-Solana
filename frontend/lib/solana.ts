import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { HELIUS_RPC_URL } from "./constants";

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(HELIUS_RPC_URL, "confirmed");
  }
  return connection;
}

export async function fetchSOLBalance(walletAddress: string): Promise<number> {
  const conn = getConnection();
  const pubkey = new PublicKey(walletAddress);
  const balance = await conn.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

export async function fetchTokenBalance(
  walletAddress: string,
  mintAddress: string,
): Promise<number> {
  const conn = getConnection();
  const wallet = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  // Derive ATA
  const [ata] = PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), mint.toBuffer()],
    new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
  );

  try {
    const info = await conn.getParsedAccountInfo(ata);
    if (info.value?.data && "parsed" in info.value.data) {
      return parseFloat(info.value.data.parsed.info.tokenAmount.uiAmountString);
    }
  } catch {
    // ATA doesn't exist
  }
  return 0;
}
