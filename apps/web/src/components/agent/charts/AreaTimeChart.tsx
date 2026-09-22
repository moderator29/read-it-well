"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { CHART_INK, CHART_SERIES } from "@/components/ui/charts/palette";

/**
 * The large area chart: one series over time, a readable y axis, a label
 * under each bucket and a hover readout (crosshair, dot and a card naming the
 * bucket and its value). Arrow keys move the readout for a keyboard reader.
 *
 * The drawing is SVG stretched to the card (`preserveAspectRatio="none"`,
 * strokes kept at their weight by `non-scaling-stroke`); every word is HTML
 * so type stays on the type scale at every width.
 *
 * It never invents a point. The caller formats every number (money through
 * the shared formatter) and decides whether a series exists at all; an empty
 * `points` draws nothing.
 */
export type AreaPoint = {
  key: string;
  /** The short axis label under the bucket ("Mar"). */
  tick: string;
  /** The readout's heading ("14 Mar 2026"). */
  readout: string;
  value: number;
  /** The value as the reader should see it ("₦52,780,000"). */
  display: string;
};

export type AxisTick = { value: number; label: string };

export function AreaTimeChart({
  points,
  yTicks,
  label,
  height = 220,
  tickEvery = 1,
}: {
  points: readonly AreaPoint[];
  yTicks: readonly AxisTick[];
  label: string;
  height?: number;
  tickEvery?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [active, setActive] = useState<number | null>(null);
  if (points.length === 0) return null;

  const W = 1000;
  const H = 300;
  const top = Math.max(...yTicks.map((t) => t.value), ...points.map((p) => p.value), 1);
  const xAt = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const yAt = (v: number) => H - (v / top) * H;
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xAt(points.length - 1).toFixed(1)} ${H} L0 ${H} Z`;

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setActive(Math.round(fraction * (points.length - 1)));
  };
  const step = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const from = active ?? points.length - 1;
    const next = event.key === "ArrowLeft" ? from - 1 : from + 1;
    setActive(Math.min(points.length - 1, Math.max(0, next)));
  };

  const shown = active === null ? null : points[active]!;
  const leftPct = active === null ? 0 : (xAt(active) / W) * 100;
  const topPct = shown ? (yAt(shown.value) / H) * 100 : 0;

  return (
    <figure className="nf-chart" aria-label={label}>
      <div className="nf-chart__frame">
        <div className="nf-chart__yaxis" aria-hidden="true" style={{ height }}>
          {yTicks.map((tick) => (
            <span key={tick.value} style={{ bottom: `${(tick.value / top) * 100}%` }}>
              {tick.label}
            </span>
          ))}
        </div>
        <div
          className="nf-chart__plot"
          style={{ height }}
          tabIndex={0}
          role="img"
          aria-label={`${label}. ${points.map((p) => `${p.readout}: ${p.display}`).join("; ")}`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(points.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={step}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={`nf-area-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_SERIES} stopOpacity="0.42" />
                <stop offset="100%" stopColor={CHART_SERIES} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {yTicks.map((tick) => (
              <line
                key={tick.value}
                x1="0"
                x2={W}
                y1={yAt(tick.value)}
                y2={yAt(tick.value)}
                stroke={CHART_INK.grid}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill={`url(#nf-area-${uid})`} />
            <path
              d={line}
              fill="none"
              stroke={CHART_SERIES}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="nf-chart__line"
            />
          </svg>
          {shown && (
            <>
              <span className="nf-chart__cross" style={{ left: `${leftPct}%` }} aria-hidden="true" />
              <span
                className="nf-chart__dot"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                aria-hidden="true"
              />
              <span
                className="nf-chart__readout"
                data-side={leftPct > 70 ? "left" : "right"}
                style={{ left: `${leftPct}%`, top: `${Math.max(0, topPct - 8)}%` }}
                role="status"
              >
                <span className="nf-chart__readout-when">{shown.readout}</span>
                <span className="nf-chart__readout-value">{shown.display}</span>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="nf-chart__xaxis" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.key} style={{ left: `${(xAt(i) / W) * 100}%` }}>
            {i % tickEvery === 0 ? p.tick : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}
