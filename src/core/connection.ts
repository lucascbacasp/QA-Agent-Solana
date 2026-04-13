import { Connection } from "@solana/web3.js";
import { CONFIG } from "./config.js";

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(CONFIG.RPC_URL, "confirmed");
  }
  return connection;
}
