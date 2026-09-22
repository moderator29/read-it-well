/**
 * The escrow float, derived twice, in integer kobo.
 *
 * WHY THIS MODULE EXISTS. The identity it computes is the one the research
 * file calls the single most important check on this feature, and records as
 * never having been asserted anywhere in this codebase, in either direction:
 *
 *   the escrow money the LEDGER says is held
 *     must equal
 *   the escrow money the AGREEMENT ROWS say is held
 *
 * exactly, to the kobo, at every moment. `private.escrow_float_components()`
 * computes it inside the database for the hourly check and the daily liability
 * snapshot. This module computes it here, from rows, so the arithmetic can be
 * tested against a full lifecycle mix without a database and so the product
 * surfaces can show a payer the same number the books carry.
 *
 * TWO IMPLEMENTATIONS OF ONE DEFINITION IS A RISK, AND IT IS TAKEN ON PURPOSE.
 * The SQL one runs where the data is and cannot be unit tested; this one can
 * be, and its test is what documents what the SQL is supposed to do. They are
 * kept in step by the probe in `scripts/probes/escrow_invariants.sql`, which
 * asserts the SQL side against seeded breaches on the live database, and by
 * `floatIdentity` being the only place either number is computed on this side.
 *
 * MONEY IS INTEGER KOBO. Every number in and out of this file is a whole
 * number of kobo. Nothing here divides, nothing here rounds, and nothing here
 * accepts a naira figure. A float in this file would be a defect.
 */

/** The nine states an escrow agreement can be in. */
export type EscrowState =
  | "INITIATED"
  | "FUNDED"
  | "HELD"
  | "RELEASE_REQUESTED"
  | "RELEASED"
  | "REFUNDED"
  | "DISPUTED"
  | "RESOLVED"
  | "CANCELLED";

/** The three escrow legs the wallet ledger carries, and nothing else. */
export type EscrowLegKind = "escrow_hold" | "escrow_release" | "escrow_refund";

/** One row of `public.wallet_entries`, reduced to what the float needs. */
export type EscrowLedgerEntry = {
  kind: EscrowLegKind;
  direction: "debit" | "credit";
  /** Only COMPLETED entries are money that has moved. */
  status: string;
  /** Integer kobo. */
  amountMinor: number;
  /** `metadata.escrow_id`, the agreement this leg belongs to. */
  escrowId: string;
};

/** One row of `public.escrows`, reduced to what the float needs. */
export type EscrowRow = {
  id: string;
  state: EscrowState;
  /** Integer kobo. */
  amountMinor: number;
};

/** One row of `public.platform_revenue` with source `escrow_commission`. */
export type EscrowCommissionRow = {
  escrowId: string;
  /** Integer kobo. */
  amountMinor: number;
};

/**
 * The four states in which an agreement can still be holding money.
 *
 * Note what is NOT here. RELEASED, REFUNDED and RESOLVED have settled.
 * CANCELLED never took anything. INITIATED has been proposed and not funded.
 */
export const LIVE_STATES: readonly EscrowState[] = [
  "FUNDED",
  "HELD",
  "RELEASE_REQUESTED",
  "DISPUTED",
] as const;

function isCompleted(entry: EscrowLedgerEntry): boolean {
  return entry.status === "COMPLETED";
}

/**
 * The float as the LEDGER has it.
 *
 * Every hold taken out of a payer's balance, minus everything paid back out of
 * escrow, minus every commission booked to the revenue table.
 *
 * THE COMMISSION SUBTRACTION IS LOAD-BEARING AND EASY TO MISS. A release
 * credits the payee the NET, not the gross, because the commission is booked
 * to `platform_revenue` instead. Leave it out and the commission sits in the
 * float for ever, the two derivations never meet, and the hourly check pages
 * every hour about an escrow system that is working correctly.
 */
export function floatFromLedger(
  entries: readonly EscrowLedgerEntry[],
  commissions: readonly EscrowCommissionRow[],
): number {
  let total = 0;
  for (const entry of entries) {
    if (!isCompleted(entry)) continue;
    if (entry.kind === "escrow_hold" && entry.direction === "debit") {
      total += entry.amountMinor;
    } else if (
      (entry.kind === "escrow_release" || entry.kind === "escrow_refund") &&
      entry.direction === "credit"
    ) {
      total -= entry.amountMinor;
    }
  }
  for (const commission of commissions) {
    total -= commission.amountMinor;
  }
  return total;
}

/** The ids of agreements the ledger has actually taken a hold for. */
export function heldAgreementIds(entries: readonly EscrowLedgerEntry[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === "escrow_hold" && entry.direction === "debit" && isCompleted(entry)) {
      ids.add(entry.escrowId);
    }
  }
  return ids;
}

/**
 * The float as the AGREEMENT ROWS have it.
 *
 * LIVE IS NOT A LIST OF STATES ON ITS OWN. `INITIATED -> DISPUTED` is a legal
 * transition, so an agreement can reach DISPUTED having never taken a kobo out
 * of anybody's balance. Counting it would put money in the float that the
 * ledger has never seen, and the difference would be reported against escrow
 * when the fault was in the counting.
 */
export function floatFromRows(
  rows: readonly EscrowRow[],
  entries: readonly EscrowLedgerEntry[],
): number {
  const held = heldAgreementIds(entries);
  let total = 0;
  for (const row of rows) {
    if (!LIVE_STATES.includes(row.state)) continue;
    if (!held.has(row.id)) continue;
    total += row.amountMinor;
  }
  return total;
}

/** What the identity check answers with. Every figure is integer kobo. */
export type FloatIdentity = {
  ledgerFloatMinor: number;
  escrowFloatMinor: number;
  /** Ledger minus rows. Zero, or somebody has to be woken up. */
  differenceMinor: number;
  /** How many agreements are behind the float. */
  escrowCount: number;
  holdsMinor: number;
  releasedMinor: number;
  refundedMinor: number;
  commissionMinor: number;
  ok: boolean;
};

/** Invariant I-2, computed. The only place either number is derived here. */
export function floatIdentity(
  rows: readonly EscrowRow[],
  entries: readonly EscrowLedgerEntry[],
  commissions: readonly EscrowCommissionRow[],
): FloatIdentity {
  const completed = entries.filter(isCompleted);
  const sum = (kind: EscrowLegKind, direction: "debit" | "credit"): number =>
    completed
      .filter((e) => e.kind === kind && e.direction === direction)
      .reduce((total, e) => total + e.amountMinor, 0);

  const ledgerFloatMinor = floatFromLedger(entries, commissions);
  const escrowFloatMinor = floatFromRows(rows, entries);
  const held = heldAgreementIds(entries);

  return {
    ledgerFloatMinor,
    escrowFloatMinor,
    differenceMinor: ledgerFloatMinor - escrowFloatMinor,
    escrowCount: rows.filter((r) => LIVE_STATES.includes(r.state) && held.has(r.id)).length,
    holdsMinor: sum("escrow_hold", "debit"),
    releasedMinor: sum("escrow_release", "credit"),
    refundedMinor: sum("escrow_refund", "credit"),
    commissionMinor: commissions.reduce((total, c) => total + c.amountMinor, 0),
    ok: ledgerFloatMinor - escrowFloatMinor === 0,
  };
}
