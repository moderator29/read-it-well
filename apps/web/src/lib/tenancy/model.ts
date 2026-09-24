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

export type CautionState = "open" | "deductions_proposed" | "agreed" | "disputed" | "returned";

export type CautionFacts = {
  amountMinor: number;
  deductions: { amountMinor: number; answer: "accepted" | "disputed" | null }[];
  returns: { amountMinor: number }[];
};

export type CautionReading = {
  state: CautionState;
  returnedMinor: number;
  deductedMinor: number;
  /** What is still owed to the tenant: never below zero. */
  outstandingMinor: number;
};

/**
 * Where a caution stands, from its rows.
 *
 * Settled ("returned") when what came back plus what the tenant accepted
 * covers the whole caution. Otherwise a disputed line outranks everything, an
 * unanswered line reads as "proposed", and a set of lines all accepted reads
 * as "agreed" while the rest is still to be returned.
 */
export function cautionState(facts: CautionFacts): CautionReading {
  const returnedMinor = facts.returns.reduce((sum, row) => sum + row.amountMinor, 0);
  const deductedMinor = facts.deductions
    .filter((row) => row.answer === "accepted")
    .reduce((sum, row) => sum + row.amountMinor, 0);
  const outstandingMinor = Math.max(0, facts.amountMinor - returnedMinor - deductedMinor);
  let state: CautionState;
  if (outstandingMinor === 0) state = "returned";
  else if (facts.deductions.some((row) => row.answer === "disputed")) state = "disputed";
  else if (facts.deductions.some((row) => row.answer === null)) state = "deductions_proposed";
  else if (facts.deductions.length > 0) state = "agreed";
  else state = "open";
  return { state, returnedMinor, deductedMinor, outstandingMinor };
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
