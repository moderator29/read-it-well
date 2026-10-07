import { intlTag, type Locale } from "@vallo/i18n/core";
import type { RangeBucket, RangeKey } from "./RangeFigure";

/**
 * COUNTING ROWS INTO THE DASHBOARD FIGURE'S THREE RANGES, in Lagos time.
 *
 *   day    one bucket per hour of today, up to and including this hour (an
 *          hour that has not happened yet is not a zero, so it is not drawn);
 *   week   one bucket per day of the last seven, today last;
 *   month  one bucket per day of the last thirty, today last.
 *
 * Each row counts once in each range it falls in, with its `value` (1 for a
 * count, kobo for money). A row outside every range, or with a timestamp that
 * does not parse, counts nowhere. Lagos is UTC+1 all year, with no daylight
 * saving, so the offset is fixed rather than looked up.
 */
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RangeRow = { at: string; value?: number };

export function bucketByRange(rows: readonly RangeRow[], now: Date, locale: Locale): Record<RangeKey, RangeBucket[]> {
  const tag = intlTag[locale];
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
  /* Midnight today in Lagos, as a UTC instant. */
  const todayStart = Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate()) - LAGOS_OFFSET_MS;
  const hourNow = lagosNow.getUTCHours();

  const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
  const weekday = new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "Africa/Lagos" });
  const dayMonth = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "Africa/Lagos" });

  const day: RangeBucket[] = Array.from({ length: hourNow + 1 }, (_, hour) => ({ label: hourLabel(hour), value: 0 }));
  const week: RangeBucket[] = Array.from({ length: 7 }, (_, index) => ({
    label: weekday.format(new Date(todayStart - (6 - index) * DAY_MS + 12 * 60 * 60 * 1000)),
    value: 0,
  }));
  const month: RangeBucket[] = Array.from({ length: 30 }, (_, index) => ({
    label: dayMonth.format(new Date(todayStart - (29 - index) * DAY_MS + 12 * 60 * 60 * 1000)),
    value: 0,
  }));

  for (const row of rows) {
    const at = Date.parse(row.at);
    if (!Number.isFinite(at) || at > now.getTime()) continue;
    const value = row.value ?? 1;
    const daysAgo = Math.floor((todayStart + DAY_MS - 1 - at) / DAY_MS);
    if (at >= todayStart) {
      const hour = Math.floor((at - todayStart) / (60 * 60 * 1000));
      const hourBucket = day[hour];
      if (hourBucket) hourBucket.value += value;
    }
    const weekBucket = daysAgo >= 0 ? week[6 - daysAgo] : undefined;
    if (weekBucket) weekBucket.value += value;
    const monthBucket = daysAgo >= 0 ? month[29 - daysAgo] : undefined;
    if (monthBucket) monthBucket.value += value;
  }
  return { day, week, month };
}

/** The earliest instant the month range reads, for the query's lower bound. */
export function rangeFloor(now: Date): string {
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
  const todayStart = Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate()) - LAGOS_OFFSET_MS;
  return new Date(todayStart - 29 * DAY_MS).toISOString();
}
