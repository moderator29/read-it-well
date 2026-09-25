import { formatNumber, type Locale } from "@vallo/i18n/core";
import type { Listing } from "./types";

/**
 * EVERY FEE AS A SHARE OF A YEAR'S RENT (V-12). Pure, integer arithmetic.
 *
 * The move-in breakdown was honest and still made a renter do arithmetic to
 * discover that a quarter of a year's rent goes to the agent. A ratio is the
 * unit people compare, so each of the three fees paid to the agent (agency,
 * legal, agreement) is printed with its share, and the three together are
 * printed as one share beneath them.
 *
 * THE ARITHMETIC. `bps = floor(fee * 10000 / annual rent)`, in integers, with
 * BigInt so a fee on a very expensive sale-sized rent cannot lose precision
 * past 2^53. A quarterly or monthly rent is annualised by multiplication only
 * (4 or 12), never by division, so there is no rounding before the ratio.
 * Display is to one decimal, truncated rather than rounded, so a fee is never
 * printed as a larger share than it is.
 *
 * WHAT GETS NO RATIO. A fee the lister did not declare (it is not zero, it is
 * unstated), a listing that is not a tenancy, and a tenancy with no rent. A
 * declared zero gets 0.0 per cent, because "no fee" is a fact.
 */

export type FeeKey = "agency" | "legal" | "agreement";
export const FEE_KEYS: readonly FeeKey[] = ["agency", "legal", "agreement"];

const MULTIPLIER = { year: 1n, quarter: 4n, month: 12n } as const;

/** A year's rent in kobo, or null when this is not a tenancy with a rent. */
export function annualRentMinor(listing: Pick<Listing, "priceMinor" | "pricePeriod" | "intent">): bigint | null {
  if (listing.intent === "sale") return null;
  const period = listing.pricePeriod;
  if (period !== "year" && period !== "quarter" && period !== "month") return null;
  if (!(listing.priceMinor > 0)) return null;
  return BigInt(Math.trunc(listing.priceMinor)) * MULTIPLIER[period];
}

/** A fee's share of the annual rent, in whole basis points. */
export function shareBps(feeMinor: number, annualMinor: bigint): number {
  if (annualMinor <= 0n || !(feeMinor >= 0)) return 0;
  return Number((BigInt(Math.trunc(feeMinor)) * 10_000n) / annualMinor);
}

function feeOf(listing: Listing, key: FeeKey): number | undefined {
  const value =
    key === "agency" ? listing.agencyFeeMinor : key === "legal" ? listing.legalFeeMinor : listing.agreementFeeMinor;
  return value === undefined || value === null ? undefined : value;
}

export type FeeShares = {
  /** Per declared fee: its kobo and its share. Undeclared fees are absent. */
  each: Partial<Record<FeeKey, { minor: number; bps: number }>>;
  /**
   * The three fees together, ONLY when all three are declared (a declared
   * zero counts). A total over two of three would reward leaving a fee out
   * (review of batch 1): the listing that hides its legal fee would print a
   * smaller share than the one that states it.
   */
  total: { minor: number; bps: number; declared: number } | null;
};

/** The shares for a listing, or null when it is not a tenancy with a rent. */
export function feeShares(listing: Listing): FeeShares | null {
  const annual = annualRentMinor(listing);
  if (annual === null) return null;
  const each: FeeShares["each"] = {};
  let sum = 0;
  let declared = 0;
  for (const key of FEE_KEYS) {
    const minor = feeOf(listing, key);
    if (minor === undefined) continue;
    each[key] = { minor, bps: shareBps(minor, annual) };
    sum += minor;
    declared += 1;
  }
  return {
    each,
    total: declared === FEE_KEYS.length ? { minor: sum, bps: shareBps(sum, annual), declared } : null,
  };
}

/**
 * The sort key for "Lowest fees on top of rent": the three fees as one share,
 * or null when it cannot be stated (not a tenancy, or any of the three fees
 * undeclared). A null sorts LAST, because unstated is not cheap.
 */
export function feeSortKey(listing: Listing): number | null {
  const shares = feeShares(listing);
  return shares?.total ? shares.total.bps : null;
}

/** Basis points as a percentage to one decimal, truncated: 2,500 is "25.0%". */
export function formatBps(bps: number, locale: Locale): string {
  const tenths = Math.trunc(bps / 10);
  return `${formatNumber(tenths / 10, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
