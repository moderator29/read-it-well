import { PROMOTION_METRICS, PROMOTION_TIER_TABLE, type PromotionMetric, type PromotionTierSlug } from "./tiers";

/**
 * WHAT A LISTER'S PROMOTION RESULTS SCREEN MAY SAY, DECIDED AWAY FROM HOW IT
 * LOOKS (`VALLO_PROMOTION.md`, "The measurement surface"; statement 6).
 *
 * THE ONE LAW: A FIGURE WITH NOTHING BEHIND IT IS NO DATA, NEVER ZERO. A zero
 * is a measurement ("nobody saved it"); no data is the absence of one. So a
 * value is either a count Session 2's read returned or `null`, and anything
 * that is not a finite, whole, non-negative number is `null`. Nothing here
 * estimates, models, extrapolates or rounds up, and nothing projects ("this
 * will get you X leads" is never computed, so it can never be printed).
 *
 * Session 2 owns the read (request in the Session 3 report). Until it exists
 * the read is `not-live`, and every one of the ten figures is no data.
 */
export type PromotionMeasurementRead =
  | { state: "not-live" }
  | {
      state: "ready";
      tier: PromotionTierSlug;
      /** Counts per metric, as recorded. A missing key is no data. */
      values: Partial<Record<PromotionMetric, unknown>>;
      /** Whether Session 2 found enough data for a valid organic comparison. */
      comparisonValid: boolean;
    };

export type PromotionMetricRow = { metric: PromotionMetric; value: number | null };

/** A recorded count, or `null`. Never a guess and never a zero standing in for nothing. */
export function countOrNoData(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * The rows the screen draws. Not live: all ten, each no data. Ready: the
 * metrics the tier measures, in the spec's order, each a count or no data.
 */
export function measurementRows(read: PromotionMeasurementRead): PromotionMetricRow[] {
  if (read.state !== "ready") return PROMOTION_METRICS.map((metric) => ({ metric, value: null }));
  const measured = PROMOTION_TIER_TABLE[read.tier].analytics.metrics;
  return measured.map((metric) => ({ metric, value: countOrNoData(read.values[metric]) }));
}
