import type { Listing } from "./types";

/**
 * RECOMMENDED, AS A PUBLISHED FORMULA (V-06). Client-safe and pure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS.
 *
 * "Recommended" used to order by `featured desc, published_at desc` on a
 * boolean nothing set, so it was recency, which rewards reposting, sitting on
 * a column that was the lever a future sales conversation would reach for.
 * Every Nigerian portal's revenue is visibility; the date on a listing there
 * means the agent paid. The column is deleted (migration 20260924130400) and
 * this replaces it: an order made only from facts about the listing, stated
 * in words on /standards, where the words are GENERATED FROM THE CONSTANTS
 * BELOW. The prose and the code read the same list, so they cannot drift: add
 * an input here and /standards names it; remove one and it disappears from
 * the page in the same commit.
 *
 * ---------------------------------------------------------------------------
 * THE FORMULA.
 *
 *   1. Real listings before example listings, always.
 *   2. Then by points, highest first, one point for each input that holds.
 *   3. Then newest first (the order the read arrives in; the sort is stable).
 *
 * The inputs are each a yes or no about the row, deliberately capped at one
 * point, so no single input can be bought, gamed or padded into dominance, and
 * none of them is a payment, a subscription, a boost or a relationship with
 * Vallo. NOBODY CAN PAY TO BE HIGHER. There is no input for money and there
 * will not be one.
 *
 * INPUTS THAT WAIT FOR THEIR FACTS. The entry names three more: how recently
 * the owner confirmed the place is available (V-31), how quickly the lister
 * answers enquiries and whether they keep the inspections they accept (V-34's
 * Record). None of those facts exists yet, and an input the platform cannot
 * compute is not published as if it were. Each joins `RANK_INPUTS` when its
 * column does, and /standards says so the same day.
 */

export type RankInputKey = "costs" | "utilities" | "photos" | "checked";

/**
 * How many of the newest matching rows the order is computed over. The same
 * number as `CATALOGUE_LIMIT` in `supabase-repository.ts` (a spec holds them
 * together), and printed on /standards so the page does not claim to rank
 * listings the read never fetched.
 */
export const RANK_CEILING = 200;

/** The photographs that earn the photos point. */
export const RANK_MIN_PHOTOS = 5;

export type RankInput = {
  key: RankInputKey;
  /** Always 1. Named so the published sentence can say so. */
  points: 1;
  holds(listing: Listing): boolean;
};

const declared = (value: number | undefined | null) => value !== undefined && value !== null;

/** Every cost beyond the headline is named, for the market the listing is in. */
function costsDeclared(listing: Listing): boolean {
  const period = listing.pricePeriod;
  if (listing.intent === "sale") {
    return (
      listing.purchaseCostStated === true ||
      [
        listing.saleAgencyFeeMinor,
        listing.saleLegalFeeMinor,
        listing.governorsConsentFeeMinor,
        listing.stampDutyMinor,
        listing.surveyRegistrationFeeMinor,
      ].every(declared)
    );
  }
  if (period === "year" || period === "quarter" || period === "month") {
    return [
      listing.cautionDepositMinor,
      listing.agencyFeeMinor,
      listing.legalFeeMinor,
      listing.agreementFeeMinor,
    ].every(declared);
  }
  /* A nightly or per-head rate has no fees to declare beyond itself. */
  return listing.priceMinor > 0;
}

export const RANK_INPUTS: readonly RankInput[] = [
  { key: "costs", points: 1, holds: costsDeclared },
  {
    key: "utilities",
    points: 1,
    holds: (l) => Boolean(l.utilities?.powerGrid) && Boolean(l.utilities?.waterSupply),
  },
  { key: "photos", points: 1, holds: (l) => l.photos.length >= RANK_MIN_PHOTOS },
  /* The published badge, which the mapper already refuses on an example. */
  { key: "checked", points: 1, holds: (l) => l.verified },
];

export const RANK_MAX = RANK_INPUTS.reduce((sum, input) => sum + input.points, 0);

export type RankBreakdown = { score: number; held: RankInputKey[] };

export function rankScore(listing: Listing): RankBreakdown {
  const held = RANK_INPUTS.filter((input) => input.holds(listing));
  return { score: held.reduce((sum, input) => sum + input.points, 0), held: held.map((i) => i.key) };
}

/**
 * The Recommended order. Stable: equal listings keep the order they arrived
 * in, which is newest first from the read.
 */
export function rankRecommended<T extends Listing>(listings: readonly T[]): T[] {
  const scored = listings.map((listing, index) => ({ listing, index, score: rankScore(listing).score }));
  scored.sort(
    (a, b) =>
      Number(a.listing.isDemo) - Number(b.listing.isDemo) || b.score - a.score || a.index - b.index,
  );
  return scored.map((entry) => entry.listing);
}

/* -------------------------------------------------------- the published words */

/** The copy the prose is built from; the dictionary supplies it. */
export type RankingCopy = {
  intro: string;
  inputs: Record<RankInputKey, string>;
  order: string;
  promise: string;
};

/**
 * The formula, in words, from the same constants the sort uses. /standards
 * prints exactly this; nothing on that page describes the order by hand.
 */
export function rankingProse(copy: RankingCopy): { intro: string; inputs: string[]; order: string; promise: string } {
  return {
    intro: copy.intro.replace("{count}", String(RANK_INPUTS.length)),
    inputs: RANK_INPUTS.map((input) => copy.inputs[input.key].replace("{min}", String(RANK_MIN_PHOTOS))),
    order: copy.order.replace("{ceiling}", String(RANK_CEILING)),
    promise: copy.promise,
  };
}
