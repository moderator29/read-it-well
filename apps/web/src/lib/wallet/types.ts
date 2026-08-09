/**
 * Wallet domain types.
 *
 * Mirrors the database vocabulary in supabase/migrations (wallet_entry_kind,
 * wallet_entry_direction, wallet_entry_status) so the service layer and the UI
 * speak the same words as the ledger. Every amount is integer kobo (Master
 * Rule 50); a balance is never stored, only derived from COMPLETED entries.
 */

/**
 * The kinds of movement a ledger row can be.
 *
 * The three escrow kinds are here for the same reason they are in
 * `public.wallet_entry_kind` rather than in a table of their own: escrow money
 * is wallet money and it appears in the one statement with everything else.
 * A hold is a debit that has left the payer's spendable balance and not yet
 * reached anybody; a release is the credit landing on the other side; a refund
 * is the credit going back. There is no second ledger, so there is no second
 * balance to reconcile against this one.
 *
 * This union has to stay a superset of the database enum, because
 * readStatement maps a row straight onto it. When a kind is added to the enum
 * it is added here and the statement screen has to learn to draw it, which the
 * exhaustive `Record<WalletEntryKind, ...>` maps in TransactionsSection make a
 * compile error rather than a blank row.
 */
export type WalletEntryKind =
  | "deposit"
  | "withdrawal"
  | "payment"
  | "refund"
  | "transfer_in"
  | "transfer_out"
  | "escrow_hold"
  | "escrow_release"
  | "escrow_refund";

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
   * RLS. False when the viewer is signed out or Supabase is unconfigured.
   */
  live: boolean;
  /**
   * True when the ledger read THREW and these figures are therefore not an
   * answer, only the absence of one.
   *
   * This flag exists because of a real incident. The reader used to catch its
   * own failure and return a zero balance with no entries, which is
   * indistinguishable on screen from a wallet that is genuinely empty. An
   * account was funded, the credit never reached the ledger, and the page
   * calmly reported nothing wrong for days.
   *
   * A balance is a claim about somebody's money. When we cannot make that
   * claim, the screen has to say so rather than print a confident zero.
   */
  readFailed: boolean;
};

export interface WalletRepository {
  readonly isSeed: boolean;
  getWallet(): Promise<WalletSummary>;
}
