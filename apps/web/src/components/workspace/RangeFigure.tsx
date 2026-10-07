"use client";

import { useId, useState } from "react";
import { formatMoney, formatNumber, type Locale } from "@vallo/i18n/core";
import { Segmented } from "@/components/ui/Segmented";
import { Odometer } from "@/components/ui/Odometer";
import "./range-figure.css";

/**
 * THE DASHBOARD FIGURE (the founder's reference 5: Day / Week / Month,
 * "19,204 total views"). One raised card: a segmented range switch whose
 * selected segment is the brand-lit capsule, one very large tight tabular
 * number, a quiet label under it, then a smooth line with a faint gradient
 * fill over three hairline gridlines.
 *
 * REAL DATA ONLY. The caller hands in the buckets it counted from rows it
 * read (one per hour of today, per day of the last seven, per day of the last
 * thirty), and the figure is their sum, so the number and the line cannot
 * disagree. A range with nothing in it says so in words instead of drawing a
 * flat line that looks like a broken chart; nothing is ever filled in.
 *
 * MOTION. The number rolls on `Odometer` when the range changes; the line
 * draws itself in from the left (a clip that opens, 620ms on the entrance
 * curve), because the three ranges have different numbers of points and a
 * path cannot morph between them honestly. Reduced motion, Calm and Off get
 * the settled frame (the CSS drops the animation; `Odometer` honours the
 * motion gate itself).
 */
export type RangeKey = "day" | "week" | "month";
export type RangeBucket = { label: string; value: number };

export function RangeFigure({
  title,
  series,
  captions,
  segments,
  empty,
  locale,
  unit = "count",
  initial = "week",
  testId,
}: {
  /** The card's accessible name and its quiet heading, e.g. "Viewing requests". */
  title: string;
  series: Record<RangeKey, readonly RangeBucket[]>;
  /** The quiet label under the number for each range. */
  captions: Record<RangeKey, string>;
  segments: Record<RangeKey, string>;
  /** What a range with nothing in it says, for each range. */
  empty: Record<RangeKey, string>;
  locale: Locale;
  /** `money` reads every value as kobo. */
  unit?: "count" | "money";
  initial?: RangeKey;
  testId?: string;
}) {
  const [range, setRange] = useState<RangeKey>(initial);
  const buckets = series[range];
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const shown = unit === "money" ? formatMoney(total, locale) : formatNumber(total, locale);
  const gradientId = useId().replace(/:/g, "");

  return (
    <section className="nf-rfig" aria-label={title} data-testid={testId}>
      <div className="nf-rfig__head">
        <h2 className="nf-rfig__title">{title}</h2>
        <Segmented
          options={(["day", "week", "month"] as const).map((key) => ({ value: key, label: segments[key] }))}
          value={range}
          onChange={setRange}
          variant="solid"
          size="sm"
          label={title}
        />
      </div>

      <p className="nf-rfig__figure nf-numeric" data-testid={testId ? `${testId}-total` : undefined}>
        <Odometer value={shown} />
      </p>
      <p className="nf-rfig__caption">{total > 0 ? captions[range] : empty[range]}</p>

      {total > 0 ? <Curve key={range} buckets={buckets} gradientId={gradientId} /> : <div className="nf-rfig__rest" aria-hidden="true" />}
    </section>
  );
}

const W = 320;
const H = 112;
const PAD_Y = 10;

/** A smooth line through the buckets (Catmull-Rom as cubic Béziers), with its fill. */
function Curve({ buckets, gradientId }: { buckets: readonly RangeBucket[]; gradientId: string }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.value));
  const step = buckets.length > 1 ? W / (buckets.length - 1) : W;
  const points = buckets.map((bucket, index) => ({
    x: buckets.length > 1 ? index * step : W / 2,
    y: PAD_Y + (H - PAD_Y * 2) * (1 - bucket.value / max),
  }));
  const line = smoothPath(points);
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const last = points[points.length - 1];
  const first = buckets[0]?.label ?? "";
  const end = buckets[buckets.length - 1]?.label ?? "";

  return (
    <figure className="nf-rfig__chart" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="nf-rfig__svg">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" className="nf-rfig__fill-top" />
            <stop offset="100%" className="nf-rfig__fill-bottom" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((share) => (
          <line key={share} x1="0" x2={W} y1={H * share} y2={H * share} className="nf-rfig__grid" />
        ))}
        <path d={area} fill={`url(#${gradientId})`} className="nf-rfig__area" />
        <path d={line} className="nf-rfig__line" vectorEffect="non-scaling-stroke" />
      </svg>
      {last ? (
        <span className="nf-rfig__dot" style={{ left: `${(last.x / W) * 100}%`, top: `${(last.y / H) * 100}%` }} />
      ) : null}
      <figcaption className="nf-rfig__axis">
        <span>{first}</span>
        <span>{end}</span>
      </figcaption>
    </figure>
  );
}

function smoothPath(points: readonly { x: number; y: number }[]): string {
  const start = points[0];
  if (!start) return "";
  if (points.length === 1) return `M 0 ${start.y} L ${W} ${start.y}`;
  const round = (value: number) => Math.round(value * 10) / 10;
  let d = `M ${round(start.x)} ${round(start.y)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (!p1 || !p2) break;
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;
    /* Tension 1/6: smooth, and never overshooting far below zero on a spike. */
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = Math.min(H - PAD_Y / 2, p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = Math.min(H - PAD_Y / 2, p2.y - (p3.y - p1.y) / 6);
    d += ` C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
}
