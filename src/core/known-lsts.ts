import { PublicKey } from "@solana/web3.js";

export interface KnownLST {
  name: string;
  mint: PublicKey;
  decimals: number;
  /** The SPL Stake Pool state or Marinade state account needed for price updates */
  poolState: PublicKey;
}

export const KNOWN_LSTS: KnownLST[] = [
  {
    name: "jitoSOL",
    mint: new PublicKey("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"),
    decimals: 9,
    poolState: new PublicKey("Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb"),
  },
  {
    name: "mSOL",
    mint: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"),
    decimals: 9,
    poolState: new PublicKey("8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC"),
  },
  {
    name: "bSOL",
    mint: new PublicKey("bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1"),
    decimals: 9,
    poolState: new PublicKey("stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi"),
  },
];
