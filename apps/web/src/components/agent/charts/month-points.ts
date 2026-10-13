import { formatDate, formatMoney, formatMoneyGlance, type Locale } from "@vallo/i18n/core";
import { axisTicks, type AxisTick, type VizPoint } from "@/components/ui/charts/chart-rules";

/**
 * Month buckets as the chart system draws them (chart rule 1, period bars).
 *
 * Server-side on purpose: the labels and the money are formatted here, in
 * the reader's locale, through the shared formatters, and arrive at the
 * client chart as plain strings. Nothing here decides which months exist;
 * `settledSeries` in the analytics read does that, with its reasons, and
 * this only names them.
 */
export type MonthValue = { key: string; year: number; month: number; minor: number };

function monthDate(year: number, month: number): Date {
  /* Noon UTC on the 15th, so no timezone can move it into another month. */
  return new Date(Date.UTC(year, Math.max(0, month - 1), 15, 12));
}

export function monthPoint(m: MonthValue, locale: Locale): VizPoint {
  const date = monthDate(m.year, m.month);
  return {
    key: m.key,
    tick: formatDate(date, locale, { month: "short" }),
    label: formatDate(date, locale, { month: "long", year: "numeric" }),
    value: m.minor,
    display: formatMoney(m.minor, locale),
  };
}

/** The y axis for a money series in minor units, labelled at a glance ("N25k"). */
export function moneyTicks(points: readonly VizPoint[], locale: Locale): AxisTick[] {
  const max = Math.max(0, ...points.map((p) => p.value ?? 0));
  /* Steps in whole naira, so a tick never lands on kobo. */
  return axisTicks(max / 100, (naira) => formatMoneyGlance(naira * 100, locale)).map((t) => ({
    value: t.value * 100,
    label: t.label,
  }));
}

/** The Lagos calendar month an instant falls in, as "YYYY-MM". */
export function lagosMonth(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit" })
    .format(at)
    .slice(0, 7);
}

/**
 * The hatched frame for a series with nothing on record (chart rule 4): the
 * last `count` real months ending at `nowKey`, every one null. The periods
 * are true; there is simply nothing in them, and the chart says so in words.
 */
export function absentMonths(nowKey: string, count: number, locale: Locale): VizPoint[] {
  const [y, m] = nowKey.split("-").map(Number);
  if (!y || !m) return [];
  const out: VizPoint[] = [];
  for (let back = count - 1; back >= 0; back--) {
    const index = y * 12 + (m - 1) - back;
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const date = monthDate(year, month);
    out.push({
      key: `${year}-${String(month).padStart(2, "0")}`,
      tick: formatDate(date, locale, { month: "short" }),
      label: formatDate(date, locale, { month: "long", year: "numeric" }),
      value: null,
    });
  }
  return out;
}
