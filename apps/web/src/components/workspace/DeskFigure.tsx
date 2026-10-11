import type { Dictionary, Locale } from "@vallo/i18n/core";
import { RangeFigure } from "./RangeFigure";
import { bucketByRange, type RangeRow } from "./range-buckets";

/**
 * A desk's figure card (reference 5), built from rows the page read: the
 * agent dashboard counts viewing requests, the host console room bookings.
 * The buckets are counted here, on the server, so the client only switches
 * between three finished series. No rows read (null) draws nothing.
 */
export function DeskFigure({
  rows,
  kind,
  t,
  locale,
  now,
}: {
  rows: readonly RangeRow[] | null;
  kind: "viewings" | "bookings";
  t: Dictionary;
  locale: Locale;
  now: Date;
}) {
  if (rows === null) return null;
  const words = t.desk.figure;
  const series = words[kind];
  return (
    <RangeFigure
      title={series.title}
      series={bucketByRange(rows, now, locale)}
      captions={{ day: series.day, week: series.week, month: series.month }}
      empty={{ day: series.emptyDay, week: series.emptyWeek, month: series.emptyMonth }}
      segments={{ day: words.day, week: words.week, month: words.month }}
      locale={locale}
      testId={`desk-figure-${kind}`}
    />
  );
}
