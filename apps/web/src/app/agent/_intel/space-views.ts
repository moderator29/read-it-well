import { formatDate, formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import { axisTicks, type VizPoint } from "@/components/ui/charts/chart-rules";
import {
  METRIC_SOURCE,
  METRIC_STAGE,
  SPACE_METRICS,
  countByListing,
  countRange,
  funnelTotals,
  rangesFor,
  requestSeries,
  type Bucket,
  type CountContext,
  type RequestRow,
  type SpaceMetric,
  type SpaceRange,
} from "@/components/agent/intel/space-model";
import type { RangeChart, RangeRow, RangeView } from "@/components/agent/intel/range-view";
import { fill } from "../_copy";
import type { FunnelsRead } from "./space-read";

/**
 * Space Analytics in words: the model's numbers turned into `RangeView`s in
 * the reader's locale, on the server. Nothing here decides which figure
 * exists (that is `space-model.ts`); this only names them, and every figure
 * goes through the shared formatters so it reads the same as everywhere else.
 */

type Copy = Dictionary["experienceFeatures"]["analytics"];

export type MetricTitles = Record<SpaceMetric, string>;

/** Each metric's name: the module's own, and the funnel's stage words reused. */
export function metricTitles(t: Dictionary): MetricTitles {
  const a = t.experienceFeatures.analytics.metrics;
  const s = t.shape.funnel.stages;
  return {
    requests: a.requests.title,
    confirmed: a.confirmed.title,
    conversion: a.conversion.title,
    seen: s.seen,
    opened: s.opened,
    saved: s.saved,
    enquired: s.enquired,
    booked: s.booked,
  };
}

/** A day key as a Date at noon UTC, so no zone can move it to another day. */
function dayDate(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

const UTC = { timeZone: "UTC" } as const;

function bucketWords(bucket: Bucket, copy: Copy, locale: Locale): { tick: string; label: string } {
  if (bucket.kind === "day") {
    const date = dayDate(bucket.start);
    return {
      tick: formatDate(date, locale, { day: "numeric", ...UTC }),
      label: formatDate(date, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", ...UTC }),
    };
  }
  if (bucket.kind === "week") {
    const end = dayDate(bucket.end);
    return {
      tick: formatDate(end, locale, { day: "numeric", month: "short", ...UTC }),
      label: fill(copy.chart.span, {
        from: formatDate(dayDate(bucket.start), locale, { day: "numeric", month: "short", ...UTC }),
        to: formatDate(end, locale, { day: "numeric", month: "short", year: "numeric", ...UTC }),
      }),
    };
  }
  const month = dayDate(bucket.start);
  return {
    tick: formatDate(month, locale, { month: "short", ...UTC }),
    label: formatDate(month, locale, { month: "long", year: "numeric", ...UTC }),
  };
}

/** The bookings chart for one period: requests, or those of them confirmed. */
export function requestChart(
  rows: readonly RequestRow[],
  range: SpaceRange,
  ctx: CountContext,
  pick: "requests" | "confirmed",
  copy: Copy,
  locale: Locale,
): RangeChart {
  const series = requestSeries(rows, range, ctx, pick);
  const points: VizPoint[] = series.map(({ bucket, value }) => ({
    key: bucket.key,
    ...bucketWords(bucket, copy, locale),
    value,
    ...(value === null ? {} : { display: formatNumber(value, locale) }),
  }));
  const kind = series[0]?.bucket.kind ?? "day";
  const max = Math.max(0, ...points.map((p) => p.value ?? 0));
  const peak = points.reduce<VizPoint | null>(
    (best, p) => (p.value !== null && p.value > 0 && (best === null || p.value > (best.value ?? 0)) ? p : best),
    null,
  );
  return {
    kind: "bars",
    points,
    yTicks: axisTicks(max, (n) => formatNumber(n, locale)),
    label: copy.chart[pick][kind],
    ...(peak ? { summary: fill(copy.chart.most, { label: peak.label, count: peak.display ?? "" }) } : {}),
    periodHead: copy.chart.period[kind],
    valueHead: pick === "requests" ? copy.chart.requestsHead : copy.chart.confirmedHead,
    nullLabel: copy.chart.none,
    empty: copy.chart.empty,
  };
}

/** The figure a metric row shows for one period, or why it shows none. */
function metricFigure(
  metric: SpaceMetric,
  range: SpaceRange,
  requests: { rows: RequestRow[]; ctx: CountContext } | null,
  funnels: FunnelsRead,
  t: Dictionary,
  locale: Locale,
): { value: string | null; absent?: string } {
  const copy = t.experienceFeatures.analytics;
  if (METRIC_SOURCE[metric] === "bookings") {
    if (!requests) return { value: null, absent: copy.notCounted };
    const count = countRange(requests.rows, range, requests.ctx);
    if (!count) return { value: null, absent: copy.notCounted };
    if (metric === "requests") return { value: formatNumber(count.requests, locale) };
    if (metric === "confirmed") return { value: formatNumber(count.confirmed, locale) };
    return {
      value: fill(copy.ofTotal, {
        confirmed: formatNumber(count.confirmed, locale),
        total: formatNumber(count.requests, locale),
      }),
    };
  }
  if (!rangesFor(metric).includes(range)) return { value: null, absent: copy.sevenOnly };
  const stage = METRIC_STAGE[metric];
  if (funnels.state !== "ok" || !stage) return { value: null, absent: copy.notCounted };
  if (!funnels.complete) return { value: null, absent: copy.notCounted };
  return { value: formatNumber(funnelTotals(funnels.listings)[stage], locale) };
}

/**
 * The overview: booking requests as the headline for every period, the
 * requests chart, and every counted figure as a row that opens its own page.
 * Null when the requests could not be read (the page says so instead).
 */
export function overviewViews(
  requests: { rows: RequestRow[]; ctx: CountContext } | null,
  funnels: FunnelsRead,
  t: Dictionary,
  locale: Locale,
): RangeView[] | null {
  if (!requests) return null;
  const copy = t.experienceFeatures.analytics;
  const titles = metricTitles(t);
  return rangesFor("requests").map((range) => {
    const count = countRange(requests.rows, range, requests.ctx);
    const rows: RangeRow[] = SPACE_METRICS.map((metric) => {
      const figure = metricFigure(metric, range, requests, funnels, t, locale);
      const query = METRIC_SOURCE[metric] === "bookings" ? `?range=${range}` : "";
      return {
        key: metric,
        title: titles[metric],
        value: figure.value,
        ...(figure.absent ? { absent: figure.absent } : {}),
        href: `/agent/analytics/${metric}${query}`,
      };
    });
    return {
      range,
      tab: copy.ranges[range],
      span: copy.span[range],
      figure: count ? formatNumber(count.requests, locale) : null,
      figureAbsent: copy.notCounted,
      ...(count && count.requests > 0
        ? {
            sub: fill(copy.confirmedOf, {
              confirmed: formatNumber(count.confirmed, locale),
              total: formatNumber(count.requests, locale),
            }),
          }
        : {}),
      chart: requestChart(requests.rows, range, requests.ctx, "requests", copy, locale),
      ...(count === null ? { note: copy.partial } : count.requests === 0 ? { note: copy.zero } : {}),
      rows,
    };
  });
}

/**
 * A bookings metric's own page, per period: its figure, its chart (or, for
 * the confirmed share, one bar of lengths), and the period split by listing.
 */
export function bookingsMetricViews(
  metric: "requests" | "confirmed" | "conversion",
  requests: { rows: RequestRow[]; ctx: CountContext },
  titles: Map<string, string> | null,
  t: Dictionary,
  locale: Locale,
): RangeView[] {
  const copy = t.experienceFeatures.analytics;
  return rangesFor(metric).map((range) => {
    const count = countRange(requests.rows, range, requests.ctx);
    const split = countByListing(requests.rows, range, requests.ctx);
    const figure =
      count === null
        ? null
        : metric === "conversion"
          ? fill(copy.ofTotal, {
              confirmed: formatNumber(count.confirmed, locale),
              total: formatNumber(count.requests, locale),
            })
          : formatNumber(metric === "requests" ? count.requests : count.confirmed, locale);

    const chart: RangeChart | null =
      metric === "conversion"
        ? count && count.requests > 0
          ? {
              kind: "share",
              label: copy.shareLabel,
              /* Two parts that make the whole: brand for the part the
                 question is about, the muted ink for the rest (chart rule 2,
                 the emphasis form), each named with its figure. */
              segments: [
                { key: "confirmed", tone: "brand", label: t.agentAnalytics.requests.confirmed, count: count.confirmed },
                {
                  key: "rest",
                  tone: "neutral",
                  label: copy.notConfirmed,
                  count: count.requests - count.confirmed,
                },
              ],
            }
          : null
        : requestChart(requests.rows, range, requests.ctx, metric, copy, locale);

    const rows: RangeRow[] =
      split === null
        ? []
        : [...split.entries()]
            .map(([listingId, tally]) => ({ listingId, tally }))
            .sort(
              (a, b) =>
                b.tally.requests - a.tally.requests ||
                b.tally.confirmed - a.tally.confirmed ||
                a.listingId.localeCompare(b.listingId),
            )
            .map(({ listingId, tally }) => ({
              key: listingId,
              /* A request whose listing is no longer readable keeps its count
                 under the period's own word rather than vanishing. */
              title: titles?.get(listingId) ?? copy.chart.none,
              value:
                metric === "requests"
                  ? formatNumber(tally.requests, locale)
                  : metric === "confirmed"
                    ? formatNumber(tally.confirmed, locale)
                    : fill(copy.ofTotal, {
                        confirmed: formatNumber(tally.confirmed, locale),
                        total: formatNumber(tally.requests, locale),
                      }),
              href: `/agent/analytics/listings/${listingId}`,
            }));

    const note =
      count === null ? copy.partial : count.requests === 0 ? copy.zero : rows.length === 0 ? copy.noneByListing : undefined;

    return {
      range,
      tab: copy.ranges[range],
      span: copy.span[range],
      figure,
      figureAbsent: copy.notCounted,
      chart,
      ...(note ? { note } : {}),
      rows,
    };
  });
}
