/**
 * Wallet domain types.
 *
 * Mirrors the database vocabulary in supabase/migrations (wallet_entry_kind,
 * wallet_entry_direction, wallet_entry_status) so the service layer and the UI
 * speak the same words as the ledger. Every amount is integer kobo (Master
 * Rule 50); a balance is never stored, only derived from COMPLETED entries.
 */

/* ------------------------------------------------------- escrow breakdown */

/**
 * One escrow the viewer is a party to, as the wallet screen needs it.
 *
 * The type lives HERE rather than beside the read in `breakdown.ts`, because
 * that module carries `import "server-only"` and the wallet's client
 * components need this shape. A type-only import is erased at build time and
 * would probably be fine; "probably fine" is not a good enough reason to point
 * a client bundle at a server-only module.
 */
export type EscrowLine = {
  id: string;
  amountMinor: number;
  state: EscrowState;
  purpose: EscrowPurpose;
  /** The property this is against, when the listing is still readable. */
  listingId: string | null;
  listingTitle: string | null;
};

/** The eight escrow states, mirroring `public.escrow_state`. */
export type EscrowState =
  | "INITIATED"
  | "FUNDED"
  | "HELD"
  | "RELEASE_REQUESTED"
  | "RELEASED"
  | "REFUNDED"
  | "DISPUTED"
  | "RESOLVED";

/** The four escrow purposes, mirroring `public.escrow_purpose`. */
export type EscrowPurpose =
  | "rent_deposit"
  | "first_rent"
  | "purchase_deposit"
  | "purchase_balance";

/**
 * What the one balance figure is made of.
 *
 * Nothing here is summed across the three parts on purpose. See
 * lib/wallet/breakdown.ts for the whole argument.
 */
export type BalanceBreakdown = {
  /** Spendable now. The headline figure, straight from wallet_balances. */
  availableMinor: number;
  /** Integer kobo you have put into escrow and not got back or given up. */
  heldOutMinor: number;
  /** Integer kobo somebody is holding in escrow with you as the payee. */
  heldInMinor: number;
  /** The individual holds, newest first, both directions. */
  outgoing: EscrowLine[];
  incoming: EscrowLine[];
  /**
   * True when the escrow read THREW.
   *
   * The same rule the balance itself follows: a failure is reported rather
   * than shown as a zero, because "nothing is held" and "we could not check
   * what is held" are opposite facts that look identical as a 0.
   */
  readFailed: boolean;
};

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
  /**
   * The property this movement is about, when it is about one.
   *
   * Resolved on the way out of the repository from the reference the leg was
   * keyed on, never stored on the row: the ledger's job is to be exact about
   * money and a denormalised title on a money row is a title that goes stale.
   * Absent on a deposit, a withdrawal or a transfer, which are about no
   * property at all, and absent on an escrow row whose listing has since come
   * down. See lib/wallet/breakdown.ts.
   */
  property?: string;
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
  /**
   * What the one number is made of: available, held by you, held for you.
   *
   * Behind a sheet rather than on the front of the card. See
   * lib/wallet/breakdown.ts for why the headline stays one figure.
   */
  breakdown: BalanceBreakdown;
};

export interface WalletRepository {
  readonly isSeed: boolean;
  getWallet(): Promise<WalletSummary>;
}
