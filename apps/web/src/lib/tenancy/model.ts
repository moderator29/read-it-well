/**
 * THE TENANCY, AS ARITHMETIC. V-47, V-36 and V-54.
 *
 * Three small rules the tenancy file stands on, pure so they are tested
 * rather than trusted, and each the twin of something in SQL:
 *
 *   - `tenancyEnd`: move-in plus one rent period. Twin of
 *     `private.tenancy_end`. A tenancy that moved in on 31 January and is let
 *     by the month ends on 28 February (or 29th), as Postgres's own interval
 *     arithmetic has it, and so does this.
 *   - `cautionState`: the caution register keeps no state column. Whether an
 *     obligation is open, has deductions proposed, is agreed, disputed or
 *     settled is read from the rows beside it, here, once.
 *   - `reportStatus`: a tenancy report is being written, submitted,
 *     countersigned, or "not answered" when the other side has let seven days
 *     pass without countersigning.
 *
 * Money is integer kobo and nothing here divides.
 */

export type RentPeriod = "month" | "quarter" | "year";

const MONTHS: Record<RentPeriod, number> = { month: 1, quarter: 3, year: 12 };

/** Add whole months to a calendar day, clamping to the month's last day, as Postgres does. */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const targetMonthIndex = m - 1 + months;
  const year = y + Math.floor(targetMonthIndex / 12);
  const month = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(year, month, Math.min(d, lastDay)));
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** The day the tenancy ends: move-in plus one rent period. */
export function tenancyEnd(moveIn: string, period: RentPeriod): string {
  return addMonths(moveIn, MONTHS[period] ?? 12);
}

/** Days after tenancy end the caution is due back. Twin of `private.caution_return_days`. */
export const CAUTION_RETURN_DAYS = 30;

/** The day the move-out report opens: 30 days before the tenancy ends. */
export function moveOutOpensOn(moveIn: string, period: RentPeriod): string {
  return addDays(tenancyEnd(moveIn, period), -30);
}

/** Tenancy evidence is kept until this day: tenancy end plus six years. */
export function keptUntil(moveIn: string, period: RentPeriod): string {
  return addMonths(tenancyEnd(moveIn, period), 72);
}

/* -------------------------------------------------------------- caution */

export type CautionState = "open" | "deductions_proposed" | "agreed" | "disputed" | "escalated" | "returned";

export type CautionFacts = {
  amountMinor: number;
  /**
   * `allowedMinor` is what Vallo staff allowed on a disputed line
   * (`caution_dispute_rulings`); null while the dispute waits for a ruling.
   */
  deductions: { amountMinor: number; answer: "accepted" | "disputed" | null; allowedMinor?: number | null }[];
  /**
   * A return a party recorded. `standing`: counted (uncontested, or ruled
   * received), `in_doubt` (the tenant says it never arrived, not yet ruled),
   * `not_received` (ruled so). Absent means counted.
   */
  returns: { amountMinor: number; standing?: "counted" | "in_doubt" | "not_received" }[];
  /** What the Vallo Guarantee approved or paid on this caution. */
  guaranteedMinor?: number;
  /** A Guarantee claim on this caution is waiting for staff. */
  claimOpen?: boolean;
};

export type CautionReading = {
  state: CautionState;
  returnedMinor: number;
  deductedMinor: number;
  guaranteedMinor: number;
  inDoubtMinor: number;
  /** What is still owed to the tenant: never below zero. */
  outstandingMinor: number;
  /** What a Guarantee claim may ask for: outstanding less everything still in question. */
  claimableMinor: number;
};

/**
 * Where a caution stands, from its rows. Twin of `private.caution_position`.
 *
 * Settled ("returned") when counted returns, deductions (accepted, or what
 * staff allowed on a disputed line) and the Vallo Guarantee cover the whole
 * caution. Otherwise a Guarantee claim outranks everything, then anything
 * with Vallo staff (a dispute not yet ruled, a return in doubt), then an
 * unanswered line; lines all settled read as "agreed" while money is owed.
 */
export function cautionState(facts: CautionFacts): CautionReading {
  const returnedMinor = facts.returns
    .filter((row) => (row.standing ?? "counted") === "counted")
    .reduce((sum, row) => sum + row.amountMinor, 0);
  const inDoubtMinor = facts.returns
    .filter((row) => row.standing === "in_doubt")
    .reduce((sum, row) => sum + row.amountMinor, 0);
  const deductedMinor = facts.deductions.reduce((sum, row) => {
    if (row.answer === "accepted") return sum + row.amountMinor;
    if (row.answer === "disputed" && typeof row.allowedMinor === "number") return sum + row.allowedMinor;
    return sum;
  }, 0);
  const proposedMinor = facts.deductions.filter((row) => row.answer === null).reduce((sum, row) => sum + row.amountMinor, 0);
  const disputedMinor = facts.deductions
    .filter((row) => row.answer === "disputed" && typeof row.allowedMinor !== "number")
    .reduce((sum, row) => sum + row.amountMinor, 0);
  const guaranteedMinor = Math.max(0, facts.guaranteedMinor ?? 0);
  const outstandingMinor = Math.max(0, facts.amountMinor - returnedMinor - deductedMinor - guaranteedMinor);
  const claimableMinor = facts.claimOpen
    ? 0
    : Math.max(0, outstandingMinor - proposedMinor - disputedMinor - inDoubtMinor);
  let state: CautionState;
  if (outstandingMinor === 0) state = "returned";
  else if (facts.claimOpen || guaranteedMinor > 0) state = "escalated";
  else if (disputedMinor > 0 || inDoubtMinor > 0) state = "disputed";
  else if (proposedMinor > 0) state = "deductions_proposed";
  else if (facts.deductions.length > 0) state = "agreed";
  else state = "open";
  return { state, returnedMinor, deductedMinor, guaranteedMinor, inDoubtMinor, outstandingMinor, claimableMinor };
}

/* -------------------------------------------------------------- reports */

export const COUNTERSIGN_DAYS = 7;

export type ReportStatus =
  | { kind: "not_open"; opensOn: string }
  | { kind: "open" }
  | { kind: "draft" }
  | { kind: "submitted"; submittedAt: string }
  | { kind: "not_answered"; since: string }
  | { kind: "countersigned"; at: string };

export function reportStatus(input: {
  opensOn: string;
  today: string;
  report: { submittedAt: string | null; countersignedAt: string | null } | null;
  now?: Date;
}): ReportStatus {
  const { report } = input;
  if (!report) {
    return input.today < input.opensOn ? { kind: "not_open", opensOn: input.opensOn } : { kind: "open" };
  }
  if (report.countersignedAt) return { kind: "countersigned", at: report.countersignedAt };
  if (!report.submittedAt) return { kind: "draft" };
  const now = (input.now ?? new Date()).getTime();
  const due = Date.parse(report.submittedAt) + COUNTERSIGN_DAYS * 86_400_000;
  return now > due
    ? { kind: "not_answered", since: new Date(due).toISOString() }
    : { kind: "submitted", submittedAt: report.submittedAt };
}
