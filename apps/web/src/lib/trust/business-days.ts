/**
 * Nigerian business days, and the one due-by date every refund carries.
 *
 * V-24. THE PROMISE IS ONE NUMBER, AND IT IS A DATE. The founder's answer to
 * "how long does a refund take" is three to five business days; the stays copy
 * said "usually within minutes"; the Send page said "3 to 5 business days" on
 * a screen where nothing is refunded at all. Three sentences, two numbers,
 * nothing measuring either. This module makes it one: a refund is due in the
 * guest's wallet by the END of the fifth Nigerian business day after the
 * decision, Lagos time, and that instant is stored on the refund row
 * (`booking_refunds.due_by`) so a job can tell when it was missed. A promise
 * that is dated and measured is a fact; a range nobody checks is a claim.
 *
 * Wallet refunds today land the moment support decides them, so the due-by is
 * a ceiling, not a forecast. It exists so that the day card refunds arrive
 * (and take days) nothing about the promise has to be rewritten.
 *
 * THE HOLIDAY CALENDAR IS DATA, and it has a twin. `private.business_days_after`
 * in `supabase/migrations/20260924140100_v24_*.sql` computes the stored due-by
 * from `public.ng_public_holidays`, and `business-days.test.ts` reads that
 * migration and fails if the two lists disagree by a single day.
 *
 * MOON-SIGHTED HOLIDAYS ARE ESTIMATES UNTIL THE FEDERAL GOVERNMENT DECLARES
 * THEM. Eid al-Fitr, Eid al-Adha and Eid-el-Maulud move with the moon and are
 * declared days, sometimes hours, ahead. They are marked `estimated` here and
 * in the table. An estimate that turns out one day early makes a due-by one
 * business day LATER than it had to be, never earlier, which is the safe
 * direction for a promise. When the Federal Government declares a date, the
 * row is corrected in both places.
 *
 * A holiday that falls on a weekend is listed on the weekday the Federal
 * Government moves it to (a Saturday Christmas is observed on the Monday),
 * because that is the day banks and support are shut.
 *
 * The list starts at 1 October 2026, the first holiday after this was
 * written: a past date cannot move a future due-by, and a past date typed
 * from memory would be a claim nobody checked.
 */

export type PublicHoliday = { day: string; name: string; estimated: boolean };

export const NG_PUBLIC_HOLIDAYS: readonly PublicHoliday[] = [
  { day: "2026-10-01", name: "Independence Day", estimated: false },
  { day: "2026-12-25", name: "Christmas Day", estimated: false },
  { day: "2026-12-28", name: "Boxing Day (observed)", estimated: false },
  { day: "2027-01-01", name: "New Year's Day", estimated: false },
  { day: "2027-03-10", name: "Eid al-Fitr", estimated: true },
  { day: "2027-03-11", name: "Eid al-Fitr holiday", estimated: true },
  { day: "2027-03-26", name: "Good Friday", estimated: false },
  { day: "2027-03-29", name: "Easter Monday", estimated: false },
  { day: "2027-05-03", name: "Workers' Day (observed)", estimated: false },
  { day: "2027-05-17", name: "Eid al-Adha", estimated: true },
  { day: "2027-05-18", name: "Eid al-Adha holiday", estimated: true },
  { day: "2027-06-14", name: "Democracy Day (observed)", estimated: false },
  { day: "2027-08-16", name: "Eid-el-Maulud (observed)", estimated: true },
  { day: "2027-10-01", name: "Independence Day", estimated: false },
  { day: "2027-12-27", name: "Christmas Day (observed)", estimated: false },
  { day: "2027-12-28", name: "Boxing Day (observed)", estimated: false },
];

const HOLIDAY_SET = new Set(NG_PUBLIC_HOLIDAYS.map((holiday) => holiday.day));

/** How many business days a refund has, from the decision. */
export const REFUND_DUE_BUSINESS_DAYS = 5;

/** Lagos is UTC+1 all year: Nigeria has never observed daylight saving. */
const LAGOS_OFFSET_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** The Lagos calendar date of an instant, as `YYYY-MM-DD`. */
export function lagosDay(at: Date): string {
  return new Date(at.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** True for a Monday to Friday that is not a listed public holiday. */
export function isBusinessDay(day: string): boolean {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !HOLIDAY_SET.has(day);
}

function nextDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

/**
 * The Lagos date of the nth business day after an instant. The day of the
 * decision itself never counts, even when it is a business day, because a
 * refund decided at 4pm on a Friday has not had Friday.
 */
export function businessDaysAfter(from: Date, count: number): string {
  let day = lagosDay(from);
  let left = Math.max(0, Math.trunc(count));
  while (left > 0) {
    day = nextDay(day);
    if (isBusinessDay(day)) left -= 1;
  }
  return day;
}

/**
 * When a refund decided at `decidedAt` is due in the wallet: the last second
 * of the fifth business day, Lagos time. "Due by Thu 22 Oct" means by the end
 * of that Thursday, so the stored instant is 23:59:59 WAT that day.
 */
export function refundDueBy(decidedAt: Date, count: number = REFUND_DUE_BUSINESS_DAYS): Date {
  const day = businessDaysAfter(decidedAt, count);
  return new Date(Date.parse(`${day}T23:59:59+01:00`));
}

export type RefundClock =
  /** Nothing was owed, so there is no clock. */
  | { state: "nothing_owed" }
  /** The credit is in the wallet. `landedAt` is when, `onTime` whether it beat the due-by. */
  | { state: "landed"; landedAt: Date; dueBy: Date; onTime: boolean }
  /** Not yet in the wallet and still inside the promise. */
  | { state: "due"; dueBy: Date }
  /** Not yet in the wallet and the promise has been missed. */
  | { state: "overdue"; dueBy: Date };

/**
 * Where one refund stands against its promise. `landedAt` is the credit's
 * own time when the wallet entry is COMPLETED, and null otherwise.
 */
export function refundClock(input: {
  refundMinor: number;
  dueBy: Date;
  landedAt: Date | null;
  now?: Date;
}): RefundClock {
  if (input.refundMinor <= 0) return { state: "nothing_owed" };
  if (input.landedAt) {
    return {
      state: "landed",
      landedAt: input.landedAt,
      dueBy: input.dueBy,
      onTime: input.landedAt.getTime() <= input.dueBy.getTime(),
    };
  }
  const now = input.now ?? new Date();
  return now.getTime() > input.dueBy.getTime()
    ? { state: "overdue", dueBy: input.dueBy }
    : { state: "due", dueBy: input.dueBy };
}
