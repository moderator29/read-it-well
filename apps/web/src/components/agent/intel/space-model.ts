/**
 * SPACE ANALYTICS, AS ARITHMETIC (feature register J3, north star 16.6, D25).
 *
 * The rules about which figures may exist for which period, kept pure and in a
 * `.ts` file so every one of them is proved in `space-model.test.ts` (the
 * vitest config cannot import a `.tsx` file; `lister-role.ts` says why). The
 * reads that feed this live in `app/agent/_intel/space-read.ts`; the words and
 * the formatting in `space-views.ts`. Nothing here reads, formats or guesses.
 *
 * WHAT THE DATA CAN ANSWER, AND FOR WHICH PERIOD. The register asks for eleven
 * metrics across four ranges (7 days, 30 days, 90 days, all time). Two sources
 * exist and they do not cover the same ground:
 *
 *   bookings      every request against the lister's listings, each with the
 *                 moment it was made, under the lister's own RLS. A request is
 *                 a row, so any period can be counted: all four ranges.
 *   listing_funnel  seen in results, opened, saved, enquired, viewing booked
 *                 and viewed, per listing, over a FIXED seven days
 *                 (migration 20260928231155). It takes no period argument, so
 *                 these figures exist for 7 days and for nothing else.
 *
 * So a funnel metric offers one range and a bookings metric offers four, and
 * the period control only ever offers what the figures under it can answer
 * (dataviz: a filter scopes everything below it). The four the data cannot
 * answer at all (unique viewers across days, engaged views, shares, contact
 * reveals) are named as not counted, never drawn (`NOT_COUNTED`).
 *
 * ZERO IS NOT NULL. A day after the lister joined with no request in it is a
 * measured zero: the bookings table is the complete record of requests, so
 * nothing there means nothing happened. A day before they joined is null, a
 * hatched slot: they were not here, which is a different statement from "you
 * had none". And when the read hit its ceiling (the oldest rows were not
 * read), every period that reaches back to that edge is null too, because a
 * total that silently omits the oldest rows is a wrong total.
 *
 * LAGOS DAYS. Every request is filed under the Lagos calendar day it was made
 * on, the same day `lagosToday` and the earnings months use. West Africa Time
 * is UTC+1 all year with no daylight saving, so the fixed offset below is the
 * whole of the conversion rather than an approximation of it.
 */

import { FUNNEL_STAGES, type Funnel, type FunnelStage } from "@/lib/agent/funnel";

export const SPACE_RANGES = ["7d", "30d", "90d", "all"] as const;
export type SpaceRange = (typeof SPACE_RANGES)[number];

/**
 * The range a page opens on. Seven days, because it is the one period in
 * which every counted figure speaks (the funnel counts nothing else), so the
 * first screen an agent sees has no figure waiting on a different period.
 */
export const DEFAULT_RANGE: SpaceRange = "7d";

const RANGE_DAYS: Record<Exclude<SpaceRange, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** The figures with a source, in the order the overview lists them. */
export const SPACE_METRICS = [
  "requests",
  "confirmed",
  "conversion",
  "seen",
  "opened",
  "saved",
  "enquired",
  "booked",
] as const;
export type SpaceMetric = (typeof SPACE_METRICS)[number];

/** The register's metrics nothing on the platform counts. Named, never drawn. */
export const NOT_COUNTED = ["uniqueViewers", "engagedViews", "shares", "contacts"] as const;
export type NotCounted = (typeof NOT_COUNTED)[number];

export type MetricSource = "bookings" | "funnel";

/** Which read answers each metric. */
export const METRIC_SOURCE: Record<SpaceMetric, MetricSource> = {
  requests: "bookings",
  confirmed: "bookings",
  conversion: "bookings",
  seen: "funnel",
  opened: "funnel",
  saved: "funnel",
  enquired: "funnel",
  booked: "funnel",
};

/** The funnel stage behind a funnel metric. */
export const METRIC_STAGE: Partial<Record<SpaceMetric, FunnelStage>> = {
  seen: "seen",
  opened: "opened",
  saved: "saved",
  enquired: "enquired",
  booked: "booked",
};

export function isSpaceMetric(value: unknown): value is SpaceMetric {
  return typeof value === "string" && (SPACE_METRICS as readonly string[]).includes(value);
}

/** The periods a metric's source can answer, and no others. */
export function rangesFor(metric: SpaceMetric): readonly SpaceRange[] {
  return METRIC_SOURCE[metric] === "funnel" ? ["7d"] : SPACE_RANGES;
}

/**
 * The period a page opens on, from `?range=`. Anything the metric cannot
 * answer falls back to the default (or the one period it can), so a stale
 * link never lands on a control showing a period that is not offered.
 */
export function parseRange(raw: unknown, supported: readonly SpaceRange[] = SPACE_RANGES): SpaceRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "string" && (supported as readonly string[]).includes(value)) return value as SpaceRange;
  return supported.includes(DEFAULT_RANGE) ? DEFAULT_RANGE : (supported[0] ?? DEFAULT_RANGE);
}

/* ---------------------------------------------------------------- days */

const DAY_MS = 86_400_000;
/** West Africa Time: UTC+1, no daylight saving. */
const LAGOS_OFFSET_MS = 3_600_000;

/** The Lagos calendar day an instant falls on, as "YYYY-MM-DD", or null. */
export function lagosDayOf(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** A day key moved by whole days. Plain UTC arithmetic on a date with no time. */
export function addDays(dayKey: string, days: number): string {
  const ms = Date.parse(`${dayKey}T00:00:00Z`);
  if (!Number.isFinite(ms)) return dayKey;
  return new Date(ms + days * DAY_MS).toISOString().slice(0, 10);
}

/** The first day of a range, or null for all time. */
export function rangeStart(range: SpaceRange, todayKey: string): string | null {
  return range === "all" ? null : addDays(todayKey, -(RANGE_DAYS[range] - 1));
}

/* ------------------------------------------------------------- buckets */

export type BucketKind = "day" | "week" | "month";

/** One period on the axis: its first and last day, both inclusive. */
export type Bucket = { key: string; kind: BucketKind; start: string; end: string };

function lastDayOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/**
 * The periods a range is drawn in.
 *
 *   7 days and 30 days   one bar a day.
 *   90 days              one bar a week, the weeks ending today. Ninety is
 *                        not a whole number of weeks, so the OLDEST bar covers
 *                        the six days left over and its label says exactly
 *                        which six. The alternative, padding the range to 91
 *                        days or dropping the six, would make the bars add up
 *                        to a different total from the figure above them.
 *   all time             one bar a calendar month, from the month the lister
 *                        joined (or their first request, if that is all we
 *                        know) to this month, which ends today.
 */
export function bucketsFor(range: SpaceRange, todayKey: string, firstKey: string | null): Bucket[] {
  if (range === "7d" || range === "30d") {
    const days = RANGE_DAYS[range];
    return Array.from({ length: days }, (_, i) => {
      const day = addDays(todayKey, i - (days - 1));
      return { key: day, kind: "day" as const, start: day, end: day };
    });
  }

  if (range === "90d") {
    const first = addDays(todayKey, -(RANGE_DAYS["90d"] - 1));
    const out: Bucket[] = [];
    let end = todayKey;
    while (end >= first) {
      const naturalStart = addDays(end, -6);
      const start = naturalStart < first ? first : naturalStart;
      out.push({ key: `w${start}`, kind: "week", start, end });
      end = addDays(start, -1);
    }
    return out.reverse();
  }

  const from = firstKey && firstKey <= todayKey ? firstKey : todayKey;
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const lastYear = Number(todayKey.slice(0, 4));
  const lastMonth = Number(todayKey.slice(5, 7));
  const out: Bucket[] = [];
  /* Bounded: a malformed key cannot spin this into an endless loop. */
  for (let guard = 0; guard < 600 && (year < lastYear || (year === lastYear && month <= lastMonth)); guard += 1) {
    const key = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    const monthEnd = lastDayOfMonth(year, month);
    out.push({ key, kind: "month", start: `${key}-01`, end: monthEnd < todayKey ? monthEnd : todayKey });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

/* -------------------------------------------------------------- counts */

/** The shape the counting needs from a booking, and nothing more. */
export type RequestRow = { listingId: string; status: string; createdAt: string };

/**
 * What the counting knows about its own edges.
 *
 *   todayKey    the Lagos day it is now.
 *   joinedKey   the Lagos day the lister's agents row was made, or null when
 *               it could not be read (then nothing is hatched for being
 *               before they joined, and the run starts at their first row).
 *   horizonKey  null when every request was read. When the read stopped at
 *               its ceiling, the Lagos day of the oldest row it did read:
 *               that day and everything before it are incomplete.
 */
export type CountContext = { todayKey: string; joinedKey: string | null; horizonKey: string | null };

/** Whether every request from `startKey` onwards was read. Null start is all time. */
export function readsBackTo(startKey: string | null, ctx: CountContext): boolean {
  if (ctx.horizonKey === null) return true;
  if (startKey === null) return false;
  return startKey > ctx.horizonKey;
}

/** The rows made inside a range (by Lagos day), in the order given. */
export function rowsInRange(rows: readonly RequestRow[], range: SpaceRange, todayKey: string): RequestRow[] {
  const start = rangeStart(range, todayKey);
  return rows.filter((row) => {
    const day = lagosDayOf(row.createdAt);
    return day !== null && day <= todayKey && (start === null || day >= start);
  });
}

export type RangeCount = { requests: number; confirmed: number };

/**
 * Requests made in the range, and how many of THOSE now stand confirmed.
 *
 * A cohort, said as one: "of the requests made in these seven days, three are
 * confirmed", never "three confirmations happened this week". The bookings
 * row carries when it was made and its status now, not when its status
 * changed, so the cohort is the only true reading of the two together.
 *
 * Null when the range reaches past what was read.
 */
export function countRange(rows: readonly RequestRow[], range: SpaceRange, ctx: CountContext): RangeCount | null {
  if (!readsBackTo(rangeStart(range, ctx.todayKey), ctx)) return null;
  const inRange = rowsInRange(rows, range, ctx.todayKey);
  return {
    requests: inRange.length,
    confirmed: inRange.filter((row) => row.status === "CONFIRMED").length,
  };
}

export type SeriesPoint = { bucket: Bucket; value: number | null };

/**
 * One value per period: requests made in it, or those of them now confirmed.
 * Null for a period wholly before the lister joined, or reaching past what
 * was read (see the head of this file). Zero is a measured zero.
 */
export function requestSeries(
  rows: readonly RequestRow[],
  range: SpaceRange,
  ctx: CountContext,
  pick: "requests" | "confirmed" = "requests",
): SeriesPoint[] {
  const firstKey = ctx.joinedKey ?? earliestDay(rows);
  const buckets = bucketsFor(range, ctx.todayKey, firstKey);
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (pick === "confirmed" && row.status !== "CONFIRMED") continue;
    const day = lagosDayOf(row.createdAt);
    if (day === null) continue;
    const bucket = buckets.find((b) => day >= b.start && day <= b.end);
    if (bucket) counts.set(bucket.key, (counts.get(bucket.key) ?? 0) + 1);
  }
  return buckets.map((bucket) => {
    const beforeJoining = ctx.joinedKey !== null && bucket.end < ctx.joinedKey;
    const unread = !readsBackTo(bucket.start, ctx);
    return { bucket, value: beforeJoining || unread ? null : (counts.get(bucket.key) ?? 0) };
  });
}

/** The earliest Lagos day among the rows, or null when there are none. */
export function earliestDay(rows: readonly RequestRow[]): string | null {
  let first: string | null = null;
  for (const row of rows) {
    const day = lagosDayOf(row.createdAt);
    if (day !== null && (first === null || day < first)) first = day;
  }
  return first;
}

/**
 * Requests and confirmations per listing inside a range, or null when the
 * range reaches past what was read. A listing with none in the range is not
 * in the map; the caller decides whether to list it at zero.
 */
export function countByListing(
  rows: readonly RequestRow[],
  range: SpaceRange,
  ctx: CountContext,
): Map<string, RangeCount> | null {
  if (!readsBackTo(rangeStart(range, ctx.todayKey), ctx)) return null;
  const out = new Map<string, RangeCount>();
  for (const row of rowsInRange(rows, range, ctx.todayKey)) {
    const tally = out.get(row.listingId) ?? { requests: 0, confirmed: 0 };
    tally.requests += 1;
    if (row.status === "CONFIRMED") tally.confirmed += 1;
    out.set(row.listingId, tally);
  }
  return out;
}

/* -------------------------------------------------------------- funnel */

export type FunnelTotals = Record<FunnelStage, number>;

/**
 * Each stage summed across listings. Only meaningful when the caller read
 * every published listing's funnel: a sum over the ten most recent would be
 * a smaller number printed as the whole, so the reader says whether it is
 * complete and the view shows no total when it is not.
 */
export function funnelTotals(funnels: readonly { funnel: Funnel }[]): FunnelTotals {
  const totals = Object.fromEntries(FUNNEL_STAGES.map((stage) => [stage, 0])) as FunnelTotals;
  for (const { funnel } of funnels) {
    for (const row of funnel.rows) totals[row.stage] += row.mine;
  }
  return totals;
}

/** One stage's figure for one listing, or 0 when the stage is missing. */
export function stageOf(funnel: Funnel, stage: FunnelStage): { mine: number; median: number | null } {
  const row = funnel.rows.find((r) => r.stage === stage);
  return { mine: row?.mine ?? 0, median: row?.median ?? null };
}
