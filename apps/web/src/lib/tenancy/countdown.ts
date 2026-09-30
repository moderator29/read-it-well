/**
 * B10: THE RENT COUNTDOWN FOR A SITTING TENANT. Pure, client-safe.
 *
 * Nigerian rent is paid a year or two upfront, so the renewal date is the
 * biggest financial cliff in a tenant's year. This is a calendar and a
 * division, nothing more: how many days until the rent is due again, and the
 * arithmetic of spreading that figure over the whole months left.
 *
 * IT IS NOT A SAVINGS PRODUCT. There is no wallet, no pot and no "save"
 * button, and the sentence is worded as arithmetic ("about N a month from now
 * until then"). The figure is the rent on the tenancy record, or the
 * lister's renewal offer once one exists, and the card says which.
 *
 * Rules:
 *   - an ended tenancy (days < 0) has no countdown;
 *   - the monthly figure needs at least two whole months left; with less, the
 *     card gives the date and the figure only, because "a month" of one is
 *     just the figure;
 *   - the monthly figure is rounded UP to the next thousand naira and said
 *     with "about", so it never promises kobo precision it does not have.
 */

export type CountdownInput = {
  /** Lagos calendar day, YYYY-MM-DD. */
  today: string;
  /** The day the tenancy ends and rent is due again, YYYY-MM-DD. */
  endsOn: string;
  /** The rent on the tenancy record, in kobo. */
  rentMinor: number | null;
  /** The lister's renewal offer rent, in kobo, when one exists. */
  offerRentMinor?: number | null;
};

export type Countdown = {
  daysLeft: number;
  /** Whole calendar months from today to the due day. */
  monthsLeft: number;
  /** The figure the countdown is about, in kobo. */
  dueMinor: number;
  /** True when the figure is the lister's renewal offer. */
  fromOffer: boolean;
  /** Rounded up to the next thousand naira; null with fewer than two months. */
  perMonthMinor: number | null;
};

/** One thousand naira, in kobo. */
const ROUND_TO_MINOR = 100_000;

function dayMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

/** Whole calendar months from `from` to `to` (both YYYY-MM-DD), never negative. */
export function wholeMonthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = to.split("-").map(Number) as [number, number, number];
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return Math.max(0, months);
}

export function rentCountdown(input: CountdownInput): Countdown | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.today) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endsOn)) return null;
  const daysLeft = Math.round((dayMs(input.endsOn) - dayMs(input.today)) / 86_400_000);
  if (!Number.isFinite(daysLeft) || daysLeft < 0) return null;
  const offer = input.offerRentMinor;
  const fromOffer = typeof offer === "number" && Number.isInteger(offer) && offer > 0;
  const dueMinor = fromOffer ? (offer as number) : input.rentMinor;
  if (typeof dueMinor !== "number" || !Number.isInteger(dueMinor) || dueMinor <= 0) return null;
  const monthsLeft = wholeMonthsBetween(input.today, input.endsOn);
  const perMonthMinor =
    monthsLeft >= 2 ? Math.ceil(dueMinor / monthsLeft / ROUND_TO_MINOR) * ROUND_TO_MINOR : null;
  return { daysLeft, monthsLeft, dueMinor, fromOffer, perMonthMinor };
}
