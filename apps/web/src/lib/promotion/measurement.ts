import { PROMOTION_METRICS, PROMOTION_TIER_TABLE, type PromotionMetric, type PromotionTierSlug } from "./tiers";

/**
 * WHAT A LISTER'S PROMOTION SCREENS MAY SAY ABOUT ONE LISTING, DECIDED AWAY
 * FROM HOW THEY LOOK (`VALLO_PROMOTION-v2.md`, "The measurement surface" and
 * section 11; statement 6).
 *
 * THE ONE LAW: A FIGURE WITH NOTHING BEHIND IT IS NO DATA, NEVER ZERO. A zero
 * is a measurement ("nobody asked about it"); no data is the absence of one.
 * So a value is either a whole count the read returned or `null`, and
 * anything that is not a finite, whole, non-negative number is `null`.
 * Nothing here estimates, models, extrapolates or rounds up, and nothing
 * projects ("this will get you X leads" is never computed, so it can never be
 * printed). A `null` carries its reason (`MetricGap`), so the screen says why
 * a figure is missing instead of leaving a blank that reads as nought.
 *
 * THE BASELINE. Every listing already has its own recorded history, so the
 * read is the listing's last thirty days, as they were, without promotion
 * (section 11, "Screen 3's real example needs no promotion to have run").
 * The onboarding's third screen and the results screen draw the same read.
 *
 * THE SPLIT THAT CANNOT BE DRAWN YET. `listing_daily_stats` records no source,
 * so nothing can say how many impressions came from a promoted slot rather
 * than ordinary results. `bySource` is the place that answer lands when
 * Session 2 adds the source dimension; until a read fills it, `sourceSplit`
 * returns null and the screen says the split is not recorded.
 */

/** The window of the baseline, in days. */
export const BASELINE_DAYS = 30;

/**
 * Why a figure is no data, as a fact about the read:
 *   notReadable  Vallo records it, but no read open to the lister returns it
 *                (row level security or grants; a Session 2 request).
 *   notKept      the record does not last long enough to answer the window.
 *   readFailed   the read was refused or errored this time (reported).
 */
export type MetricGap = "notReadable" | "notKept" | "readFailed";

/** The two counters a source dimension would split. */
export const SOURCED_METRICS = ["impressions", "views"] as const;
export type SourcedMetric = (typeof SOURCED_METRICS)[number];

/** Where an impression or a view was served. Organic is the default (Session 2 request). */
export type ImpressionSource = "organic" | "promoted";

/**
 * The figures no read open to a lister returns today, and why, checked
 * against the migrations (`measurement-read.ts` says which policy or grant
 * stops each). Each is a Session 2 request, never a service-role bypass.
 */
export const LISTER_GAPS: Readonly<Partial<Record<PromotionMetric, MetricGap>>> = {
  impressions: "notReadable",
  views: "notReadable",
  uniqueViewers: "notKept",
  saves: "notReadable",
  shares: "notReadable",
  transactions: "notReadable",
};

export type ListingMeasurement = {
  windowDays: number;
  /** Counts as recorded. A `null` is no data; its reason is in `gaps`. */
  values: Record<PromotionMetric, number | null>;
  gaps: Partial<Record<PromotionMetric, MetricGap>>;
  /**
   * The same counters keyed by where they were served. ABSENT until
   * `listing_daily_stats` gains a source dimension; no read fills it today.
   */
  bySource?: Partial<Record<SourcedMetric, Partial<Record<ImpressionSource, unknown>>>>;
};

export type ListingMeasurementRead =
  /** Opened with no listing: nothing to read, and no example is invented. */
  | { state: "no-listing" }
  /** A wrong id or somebody else's listing: the page never confirms which. */
  | { state: "missing" }
  /** An example listing is never counted. */
  | { state: "example" }
  /** The listing itself could not be read. */
  | { state: "unavailable" }
  | { state: "ok"; measurement: ListingMeasurement };

export type PromotionMetricRow = { metric: PromotionMetric; value: number | null; gap: MetricGap | null };

/** A recorded count, or `null`. Never a guess and never a zero standing in for nothing. */
export function countOrNoData(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * The rows a screen draws. With no measurement: all ten, each no data and
 * with no reason to claim. With one: the metrics the tier measures (all ten
 * when no tier is named), in the spec's order, each a count or no data with
 * its reason. A `null` the read did not explain is still `null`, never zero.
 */
export function measurementRows(measurement: ListingMeasurement | null, tier?: PromotionTierSlug): PromotionMetricRow[] {
  const metrics = tier ? PROMOTION_TIER_TABLE[tier].analytics.metrics : PROMOTION_METRICS;
  if (!measurement) return metrics.map((metric) => ({ metric, value: null, gap: null }));
  return metrics.map((metric) => {
    const value = countOrNoData(measurement.values[metric]);
    return { metric, value, gap: value === null ? (measurement.gaps[metric] ?? null) : null };
  });
}

export type SourceSplitRow = { metric: SourcedMetric; promoted: number; organic: number };

/**
 * The promoted-against-organic split of impressions and views, ONLY from a
 * recorded source dimension: a metric is split when both parts are whole
 * counts and they add up to the recorded total exactly. Anything less and
 * that metric is not split; with no metric split, `null`, and no split is
 * drawn. Nothing is apportioned, inferred from dates or modelled.
 */
export function sourceSplit(measurement: ListingMeasurement | null): SourceSplitRow[] | null {
  const bySource = measurement?.bySource;
  if (!measurement || !bySource) return null;
  const rows: SourceSplitRow[] = [];
  for (const metric of SOURCED_METRICS) {
    const parts = bySource[metric];
    const promoted = countOrNoData(parts?.promoted);
    const organic = countOrNoData(parts?.organic);
    const total = countOrNoData(measurement.values[metric]);
    if (promoted === null || organic === null || total === null || promoted + organic !== total) continue;
    rows.push({ metric, promoted, organic });
  }
  return rows.length > 0 ? rows : null;
}
