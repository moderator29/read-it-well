"use client";

import { useId, useMemo, useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { Segmented } from "@/components/ui/Segmented";
import { MoneyFigure } from "./kit";
import "@/app/css/money-layer.css";

/**
 * ONE BIG NUMBER AND A SMOOTH CURVE (PREMIUM-STANDARD reference 5): a range
 * switch, the figure for the range in the figure face, a quiet label under
 * it, then the running total over the range as one smooth line with a faint
 * fill and three hairline gridlines.
 *
 * Every point is a real movement the caller read; the figure is their sum
 * over the chosen range, nothing projected or filled in. The caller decides
 * whether its record is complete enough to draw this at all (a history that
 * pages is not), and passes `note` to say what the figure covers.
 */
export type CurveEvent = { at: string; minor: number };
/** A range: its switch label, how many days back (null for everything), and the quiet line under the figure. */
export type CurveRange = { key: string; label: string; days: number | null; caption: string };

const DAY = 86_400_000;
const W = 320;
const H = 112;

/** A monotone smooth path through points already in drawing space. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0]!.x},${pts[0]!.y}`;
  let d = `M${pts[0]!.x.toFixed(1)},${pts[0]!.y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const q = pts[i + 1]!;
    const mx = (p.x + q.x) / 2;
    d += ` C${mx.toFixed(1)},${p.y.toFixed(1)} ${mx.toFixed(1)},${q.y.toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}`;
  }
  return d;
}

export function MoneyCurve({
  events,
  ranges,
  now,
  locale,
  label,
  note,
  testId,
}: {
  events: readonly CurveEvent[];
  ranges: readonly CurveRange[];
  /** The server's clock, so the ranges agree on both sides. */
  now: number;
  locale: Locale;
  /** The switch's accessible name ("Range"). */
  label: string;
  note?: string;
  testId?: string;
}) {
  const [key, setKey] = useState(ranges[0]?.key ?? "");
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const range = ranges.find((r) => r.key === key) ?? ranges[0]!;

  const { total, line, area } = useMemo(() => {
    const sorted = [...events].map((e) => ({ t: Date.parse(e.at), minor: e.minor })).filter((e) => Number.isFinite(e.t)).sort((a, b) => a.t - b.t);
    const from = range.days === null ? (sorted[0]?.t ?? now) : now - range.days * DAY;
    const inRange = sorted.filter((e) => e.t >= from && e.t <= now);
    let run = 0;
    const steps = [{ t: from, v: 0 }, ...inRange.map((e) => ({ t: e.t, v: (run += e.minor) })), { t: now, v: run }];
    const max = Math.max(1, ...steps.map((s) => s.v));
    const min = Math.min(0, ...steps.map((s) => s.v));
    const span = Math.max(1, now - from);
    const pts = steps.map((s) => ({ x: ((s.t - from) / span) * W, y: H - 6 - ((s.v - min) / (max - min || 1)) * (H - 14) }));
    const d = smoothPath(pts);
    return { total: run, line: d, area: `${d} L${W},${H} L0,${H} Z` };
  }, [events, range, now]);

  return (
    <section className="nf-curve" aria-label={range.caption} data-testid={testId}>
      {ranges.length > 1 ? (
        <Segmented options={ranges.map((r) => ({ value: r.key, label: r.label }))} value={range.key} onChange={setKey} label={label} size="sm" />
      ) : null}
      <div className="nf-curve__figure">
        <MoneyFigure minor={total} locale={locale} size="lg" kobo="auto" testId={testId ? `${testId}-figure` : undefined} />
        <p className="nf-curve__caption">{range.caption}</p>
      </div>
      <svg className="nf-curve__chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`nf-curve-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="nf-curve__stop-top" />
            <stop offset="100%" className="nf-curve__stop-bottom" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="nf-curve__grid" />
        ))}
        <path d={area} fill={`url(#nf-curve-fill-${uid})`} />
        <path d={line} className="nf-curve__line" />
      </svg>
      {note ? <p className="nf-curve__note">{note}</p> : null}
    </section>
  );
}
