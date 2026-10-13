import { budgetFigure, matchesFacts, type ListingFacts } from "@/lib/listings/filter";
import type { ListingSearchFilter } from "@/lib/listings/types";

/**
 * THE PRICE HISTOGRAM IN THE FILTER SHEET, FROM THE HOMES IN FRONT OF THE
 * READER.
 *
 * Each bar is how many homes in the sheet's pool (the same facts its live
 * count is computed from) would be judged at a figure inside that slice of the
 * price track. The figure is `budgetFigure`, the one the budget filter itself
 * judges by, so on the Rent market a bar counts the cash at the door, exactly
 * what the two thumbs bound. A home with no stated figure has no bar to stand
 * in, because unstated is not cheap. A home above the top of the track stands
 * in the last bar, which is the track's "+".
 *
 * Computed in the browser from facts the sheet already holds: no extra read,
 * no round trip, and it cannot disagree with the count on the button. It is
 * bounded by the same row ceiling the pool is, and says nothing about homes
 * the read did not return.
 */

export const HISTOGRAM_BUCKETS = 28;

/**
 * Counts per bucket over [0, ceilingMinor). Zero, negative, non-finite and
 * null figures are left out; a figure at or over the ceiling lands in the
 * last bucket.
 */
export function priceHistogram(
  figuresMinor: readonly (number | null)[],
  ceilingMinor: number,
  buckets: number = HISTOGRAM_BUCKETS,
): number[] {
  const count = Math.max(0, Math.floor(buckets));
  const out = new Array<number>(count).fill(0);
  if (count === 0 || !(ceilingMinor > 0)) return out;
  const width = ceilingMinor / count;
  for (const figure of figuresMinor) {
    if (figure === null || !Number.isFinite(figure) || figure <= 0) continue;
    const at = Math.min(count - 1, Math.floor(figure / width));
    out[at] = (out[at] ?? 0) + 1;
  }
  return out;
}

/**
 * The figure each home in the pool would be judged at, for the homes that
 * pass every OTHER part of the draft: the bars show where homes sit, so the
 * price bounds being chosen are not applied to them.
 */
export function priceFigures(facts: readonly ListingFacts[], filter: ListingSearchFilter): (number | null)[] {
  const { minPriceMinor: _min, maxPriceMinor: _max, ...rest } = filter;
  void _min;
  void _max;
  return facts.filter((fact) => matchesFacts(fact, rest)).map((fact) => budgetFigure(fact, filter));
}

/** Whether bucket `index` overlaps the chosen range, for its colour. */
export function bucketInRange(
  index: number,
  buckets: number,
  ceilingMinor: number,
  minMinor: number,
  maxMinor: number,
): boolean {
  if (buckets <= 0 || ceilingMinor <= 0) return false;
  const width = ceilingMinor / buckets;
  const start = index * width;
  /* The last bucket is open at the top: it holds everything over the track. */
  const end = index === buckets - 1 ? Number.POSITIVE_INFINITY : start + width;
  return end > minMinor && start <= maxMinor;
}
