import type { MovementKind, MovementStatus } from "./funds";

/**
 * THE WALLET'S VIEW MODEL (D81; the founder's brief of 8 October,
 * `docs/design/references/2026-10-08/WALLET-PROMPT.md`). Pure: what the
 * Overview, the Transactions screen and the move-money screens derive from
 * a read the server already made. Nothing here invents a figure, a kind or
 * a counterparty: every filter is one of the movement kinds the ledger
 * stores (`funds_movements.kind`), and every sum is over rows the provider
 * confirmed as completed.
 */

/* ------------------------------------------------------------- totals */

export type MovementTotals = { inMinor: number; outMinor: number; count: number };

/** Money in is money added and money received; money out is money sent and withdrawals. Fees are in neither. */
export function sumMovements(rows: readonly { kind: MovementKind; amountMinor: number }[]): MovementTotals {
  let inMinor = 0;
  let outMinor = 0;
  for (const r of rows) {
    if (r.kind === "deposit" || r.kind === "transfer_in") inMinor += r.amountMinor;
    else if (r.kind === "withdrawal" || r.kind === "transfer_out") outMinor += r.amountMinor;
  }
  return { inMinor, outMinor, count: rows.length };
}

/* ------------------------------------------------------------ filters */

/**
 * The Transactions screen's filters: the four kinds a member can tell apart,
 * and All. The founder's reference shows "Bills"; Vallo has no bill payments,
 * so there is no Bills filter (the brief: "adapt these categories to the
 * existing transaction model rather than inventing new transaction types").
 */
export const WALLET_FILTERS = ["all", "received", "added", "sent", "withdrawals"] as const;
export type WalletFilter = (typeof WALLET_FILTERS)[number];

const FILTER_KINDS: Record<Exclude<WalletFilter, "all">, readonly MovementKind[]> = {
  received: ["transfer_in"],
  added: ["deposit"],
  sent: ["transfer_out"],
  withdrawals: ["withdrawal"],
};

export function isWalletFilter(value: unknown): value is WalletFilter {
  return typeof value === "string" && (WALLET_FILTERS as readonly string[]).includes(value);
}

export function filterMovements<T extends { kind: MovementKind }>(rows: readonly T[], filter: WalletFilter): T[] {
  if (filter === "all") return [...rows];
  const kinds = FILTER_KINDS[filter];
  return rows.filter((r) => kinds.includes(r.kind));
}

/* ---------------------------------------------------------- direction */

/** Which way a movement went, for its sign and its colour. "other" says neither. */
export function movementDirection(kind: MovementKind): "in" | "out" | null {
  if (kind === "deposit" || kind === "transfer_in") return "in";
  if (kind === "withdrawal" || kind === "transfer_out") return "out";
  return null;
}

/**
 * The tile a row is marked with (the reference's coloured squares): green for
 * money that came in, the warm orange for money sent to someone, the blue
 * for money moved to the member's own bank.
 */
export type MovementTone = "in" | "send" | "bank" | "neutral";
export function movementTileTone(kind: MovementKind): MovementTone {
  switch (kind) {
    case "deposit":
    case "transfer_in":
      return "in";
    case "transfer_out":
      return "send";
    case "withdrawal":
      return "bank";
    default:
      return "neutral";
  }
}

/** A movement that did not move money: its figure is struck through and never counted as spent or received. */
export function didNotMove(status: MovementStatus): boolean {
  return status === "failed" || status === "cancelled" || status === "reversed";
}

/**
 * Who or where, in the reference's "From:" or "To:" line, from what the
 * record holds and nothing more: a send names the recipient as the sender
 * was shown them; a receipt never names the sender (the record does not
 * carry them); a withdrawal names the bank and the last four digits.
 */
export function counterpartyLine(kind: MovementKind, cp: Record<string, string>): string {
  switch (kind) {
    case "withdrawal": {
      const bank = [cp.bank, cp.last4 ? `•••• ${cp.last4}` : ""].filter(Boolean).join(" ");
      return bank ? `To: ${bank}` : "To: your bank";
    }
    case "transfer_out":
      return cp.name ? `To: ${cp.name}` : "To: a Vallo member";
    case "transfer_in":
      return "From: a Vallo member";
    case "deposit":
      return "From: your bank or card";
    default:
      return "";
  }
}

/* --------------------------------------------------------- the amount */

/** Whole naira typed on a keypad ("25000"), never a fraction, capped at eleven digits. */
export function cleanNaira(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
}

/** "25000" to "25,000", for the display only; the server parses the plain digits. */
export function groupNaira(digits: string): string {
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
}

/** The Supay reference's quick amounts for adding money: round figures to tap, never a suggestion. */
export const ADD_QUICK_NAIRA = [5_000, 10_000, 50_000] as const;

/**
 * What a send is for (the reference's reason chips). The chosen reason is the
 * send's own note to the recipient (`prepareSend`'s `note`, at most 100
 * characters), so it changes nothing about the money; "Other" lets the
 * member write it.
 */
export const SEND_REASONS = ["Rent", "Booking", "Split bill", "Gift", "Business", "Other"] as const;
export type SendReason = (typeof SEND_REASONS)[number];
