/**
 * Wallet domain types.
 *
 * Mirrors the database vocabulary in supabase/migrations (wallet_entry_kind,
 * wallet_entry_direction, wallet_entry_status) so the service layer and the UI
 * speak the same words as the ledger. Every amount is integer kobo (Master
 * Rule 50); a balance is never stored, only derived from COMPLETED entries.
 */

export type WalletEntryKind =
  | "deposit"
  | "withdrawal"
  | "payment"
  | "refund"
  | "transfer_in"
  | "transfer_out";

export type WalletEntryDirection = "credit" | "debit";

export type WalletEntryStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

/** One ledger row. Amount is always positive; direction says which way. */
export type WalletEntry = {
  id: string;
  kind: WalletEntryKind;
  direction: WalletEntryDirection;
  /** Integer kobo, always > 0. */
  amountMinor: number;
  /** Idempotency reference from the processor or transfer. */
  reference: string;
  status: WalletEntryStatus;
  /** ISO timestamp. */
  createdAt: string;
  /** Short human description, e.g. the counterparty or booking title. */
  note?: string;
};

export type WalletSummary = {
  /** Wallet row id, or null when the wallet has not been created yet (lazy). */
  id: string | null;
  /** Derived balance in integer kobo: sum(credits) - sum(debits), COMPLETED only. */
  balanceMinor: number;
  currency: string;
  /** Newest first. */
  entries: WalletEntry[];
};

/** What the wallet page renders: a summary plus where it came from. */
export type ViewerWallet = WalletSummary & {
  /**
   * True when the figures are the signed-in user's real ledger read under
   * RLS. False when the viewer is signed out or Supabase is unconfigured,
   * in which case the seed dataset stands in.
   */
  live: boolean;
};

export interface WalletRepository {
  readonly isSeed: boolean;
  getWallet(): Promise<WalletSummary>;
}
