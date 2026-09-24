import type { PricePeriod } from "./pricing";

/**
 * CASH IN HAND (V-65): how many months of rent a listing asks for up front,
 * and what that means at the door.
 *
 * "Two years upfront" is the defining Nigerian rental pain, and the move-in
 * total hid it: the total counts ONE period of rent, so a flat demanding 24
 * months showed the same total as one demanding 12 and understated the door
 * price of exactly the listings that hurt people most.
 *
 *   upfront months  the larger of one rent period in months and the shortest
 *                   tenancy the lister accepts, which is what they will ask
 *                   for at the start
 *   cash at the door  the move-in total, plus the rent for every period past
 *                   the first that the upfront demand covers. Integer ratios
 *                   only: 24 months on a yearly rent is two years; 18 months
 *                   on a yearly rent is not a whole number of periods, and no
 *                   figure is guessed for it (the move-in total stands, with
 *                   the months stated beside it)
 *
 * On the Rent market the budget is judged against the cash at the door, the
 * number a renter actually has to hold, and a listing that states no move-in
 * figure at all never passes a budget: unstated is not cheap.
 *
 * Money is integer kobo and nothing here divides it.
 */

const PERIOD_MONTHS: Partial<Record<PricePeriod, number>> = { month: 1, quarter: 3, year: 12 };

/** The months of rent a tenancy asks for at the start, or null when it is not a tenancy. */
export function upfrontMonths(
  period: PricePeriod | undefined,
  minimumTenancyMonths: number | undefined,
): number | null {
  const months = period ? PERIOD_MONTHS[period] : undefined;
  if (months === undefined) return null;
  const minimum = minimumTenancyMonths !== undefined && minimumTenancyMonths > 0 ? minimumTenancyMonths : 0;
  return Math.max(months, minimum);
}

export type CashShape = {
  intent?: "rent" | "sale";
  pricePeriod?: PricePeriod;
  priceMinor: number;
  moveInCostMinor?: number;
  minimumTenancyMonths?: number;
};

export type CashAtDoor = {
  /** Kobo a renter must hold at the door. */
  minor: number;
  /** Months of rent asked for up front. */
  upfrontMonths: number;
  /** Periods of rent inside `minor` (1 unless the demand is several whole periods). */
  periods: number;
  /** True when `minor` is more than the move-in total because of the demand. */
  restated: boolean;
};

/** The cash at the door for a tenancy, or null when it has no honest figure. */
export function cashAtDoor(listing: CashShape): CashAtDoor | null {
  if (listing.intent === "sale") return null;
  const months = upfrontMonths(listing.pricePeriod, listing.minimumTenancyMonths);
  if (months === null) return null;
  const moveIn = listing.moveInCostMinor ?? 0;
  if (moveIn <= 0) return null;
  const periodMonths = PERIOD_MONTHS[listing.pricePeriod!]!;
  if (months % periodMonths !== 0 || listing.priceMinor <= 0) {
    return { minor: moveIn, upfrontMonths: months, periods: 1, restated: false };
  }
  const periods = months / periodMonths;
  const extra = (periods - 1) * listing.priceMinor;
  return { minor: moveIn + extra, upfrontMonths: months, periods, restated: extra > 0 };
}

export type UpfrontCopy = {
  upfrontMonth: string;
  upfrontMonths: string;
  upfrontYear: string;
  upfrontYears: string;
};

/** "One year upfront", "2 years upfront", "18 months upfront": whole years read as years. */
export function upfrontText(months: number, copy: UpfrontCopy): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? copy.upfrontYear : copy.upfrontYears.replace("{n}", String(years));
  }
  return months === 1 ? copy.upfrontMonth : copy.upfrontMonths.replace("{n}", String(months));
}
