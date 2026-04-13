import "dotenv/config";
import { Connection, PublicKey } from "@solana/web3.js";
import { writeFileSync, mkdirSync } from "fs";
import { CONFIG } from "../core/config.js";

/**
 * Fetches the IDL for the mpSOL program from on-chain data.
 * Anchor programs store the IDL at a deterministic PDA:
 *   seeds = ["anchor:idl", programId]
 */
async function main() {
  const conn = new Connection(CONFIG.RPC_URL, "confirmed");
  const programId = CONFIG.MPSOL_PROGRAM_ID;

  console.log(`[fetch-idl] Program: ${programId.toBase58()}`);
  console.log(`[fetch-idl] RPC: ${CONFIG.RPC_URL.replace(/api-key=.*/, "api-key=***")}`);

  // Anchor IDL PDA
  const [idlAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("anchor:idl"), programId.toBuffer()],
    programId
  );
  console.log(`[fetch-idl] IDL account: ${idlAddress.toBase58()}`);

  const accountInfo = await conn.getAccountInfo(idlAddress);
  if (!accountInfo) {
    console.error("[fetch-idl] IDL account not found on-chain. Using fallback.");
    console.error("[fetch-idl] The program may not have published its IDL via Anchor.");
    process.exit(1);
  }

  // Anchor IDL accounts have an 8-byte discriminator + 4-byte length prefix,
  // followed by zlib-compressed JSON
  const data = accountInfo.data;
  const dataLen = data.readUInt32LE(8);
  const compressedIdl = data.subarray(12, 12 + dataLen);

  // Decompress
  const { inflateSync } = await import("zlib");
  let idlJson: string;
  try {
    const decompressed = inflateSync(compressedIdl);
    idlJson = decompressed.toString("utf-8");
  } catch {
    // Some programs store uncompressed IDL
    idlJson = compressedIdl.toString("utf-8");
  }

  const idl = JSON.parse(idlJson);
  mkdirSync("idl", { recursive: true });
  writeFileSync("idl/mpsol.json", JSON.stringify(idl, null, 2));
  console.log(`[fetch-idl] IDL saved to idl/mpsol.json`);
  console.log(`[fetch-idl] Instructions: ${idl.instructions?.map((i: any) => i.name).join(", ") || "N/A"}`);
}

main().catch((err) => {
  console.error("[fetch-idl] Error:", err.message);
  process.exit(1);
});
