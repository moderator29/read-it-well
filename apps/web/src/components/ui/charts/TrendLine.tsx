"use client";

import { useId, useLayoutEffect, useRef } from "react";
import "@/app/css/charts.css";
import { motionQuiet } from "@/lib/motion/gate";
import {
  MORPH_MS,
  allAbsent,
  glide,
  resample,
  scaleTop,
  showEvery,
  tickEveryFor,
  widest,
  type AxisTick,
  type VizPoint,
} from "./chart-rules";
import { CHART_CONTEXT, CHART_SERIES } from "./palette";
import { ChartTable } from "./ChartTable";
import { useChartReadout } from "./useChartReadout";

/**
 * TREND LINE: "which way is it moving" (chart rule 1). References 7065 and
 * 7066: one line, an odometer figure above it in the caller's card, and the
 * line re-forming when the period changes.
 *
 * A 2px series line with a 10% wash under it, solid hairline gridlines, the
 * last recorded point marked with an 8px dot in a 2px surface ring and its
 * value labelled beside it: one direct label, never one per point.
 *
 * `compare` is the ONE optional second series, and only for the same measure
 * in another period (last month under this month). It is the grey context
 * ink, dashed, with a hollow end marker, and the legend names both. Identity
 * is therefore pattern, marker and word as well as colour (chart rule 3).
 *
 * A null point is a gap: the line breaks and the period is hatched, never
 * bridged, because a line drawn across a missing day invents the day.
 *
 * MOTION. The first draw unrolls left to right in 620ms (a clip that scales,
 * transform only). A change of period interpolates every point from where it
 * was to where it now is in 380ms on the glide curve, resampling when the
 * number of points changes, so the eye follows the line rather than losing
 * it. Quiet motion: the new line is simply there.
 *
 * NO RENDER PER FRAME (D49.3). The morph writes each frame's `d` and the end
 * marker's position straight onto the elements; React renders the target
 * once and is not asked again until something it owns changes. It used to
 * `setState` inside the frame loop, which reconciled both paths and the
 * table twin about 23 times per morph. React leaves an attribute alone when
 * its own value for it has not changed, so a render mid-morph (a hover
 * readout) does not snap the line.
 */
export function TrendLine({
  points,
  yTicks,
  label,
  summary,
  periodHead,
  valueHead,
  seriesLabel,
  compare,
  nullLabel,
  height = 176,
  className,
}: {
  points: readonly VizPoint[];
  yTicks: readonly AxisTick[];
  label: string;
  summary?: string;
  periodHead: string;
  valueHead: string;
  /** The series' name in the legend; needed only with `compare`. */
  seriesLabel?: string;
  /** The same measure for the previous period, one value per point. */
  compare?: {
    label: string;
    values: readonly (number | null)[];
    displays: readonly (string | null)[];
  };
  nullLabel?: string;
  height?: number;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const count = points.length;
  const absent = allAbsent(points);
  const restIndex = lastRecorded(points.map((p) => p.value));
  const { active, handlers } = useChartReadout(count, restIndex, false);

  const target = points.map((p) => p.value ?? 0);
  const compareValues = compare ? compare.values.slice(0, count) : [];
  const scale = scaleOf(points, yTicks, compareValues);
  const lineRef = useRef<SVGPathElement | null>(null);
  const areaRef = useRef<SVGPathElement | null>(null);
  const dotRef = useRef<HTMLSpanElement | null>(null);
  const endLabelRef = useRef<HTMLSpanElement | null>(null);
  /* One morph frame, written to the elements; React is not involved. */
  useMorph(target, (values) => {
    const g = geometryOf(points, restIndex, scale, values);
    lineRef.current?.setAttribute("d", g.line);
    if (g.area) areaRef.current?.setAttribute("d", g.area);
    if (g.endTop !== null) {
      if (dotRef.current) dotRef.current.style.top = g.endTop;
      if (endLabelRef.current) endLabelRef.current.style.top = g.endTop;
    }
  });

  if (count === 0 || absent) return null;

  const { xAt, yAt, top } = scale;
  const every = tickEveryFor(count);
  const { line, area, endTop } = geometryOf(points, restIndex, scale, target);
  const compareLine = compare ? pathOf(scale, compareValues, compareValues.map((v) => v ?? 0), runs(compareValues)) : "";
  const compareLast = compare ? lastRecorded(compareValues) : null;

  const pct = (i: number) => (xAt(i) / W) * 100;
  const yPct = (v: number) => (yAt(v) / H) * 100;
  const end = restIndex !== null ? points[restIndex]! : null;
  const shown = active !== null ? points[active]! : null;
  const sideOf = (i: number) => {
    const at = count > 1 ? i / (count - 1) : 0.5;
    return at < 0.2 ? "start" : at > 0.8 ? "end" : "mid";
  };
  const say = (p: VizPoint) => (p.value === null ? (nullLabel ?? "–") : (p.display ?? String(p.value)));
  const readoutText = shown
    ? `${shown.label}: ${say(shown)}${compare ? `; ${compare.label}: ${compare.displays[active!] ?? nullLabel ?? "–"}` : ""}`
    : "";

  return (
    <figure className={["nf-viz", className ?? ""].filter(Boolean).join(" ")}>
      {compare ? (
        <ul className="nf-viz__legend" aria-label={label}>
          <li>
            <span className="nf-viz-key nf-viz-key--line" aria-hidden="true" />
            {seriesLabel ?? valueHead}
          </li>
          <li>
            <span className="nf-viz-key nf-viz-key--line nf-viz-key--context" aria-hidden="true" />
            {compare.label}
          </li>
        </ul>
      ) : null}
      <div className="nf-viz__frame">
        <div className="nf-viz__y" aria-hidden="true" style={{ height }}>
          {/* The widest label, in flow and invisible, so the axis column is as
              wide as its words and a long figure never hangs off the card. */}
          <i className="nf-viz__y-size nf-numeric">{widest(yTicks)}</i>
          {yTicks.map((tick) => (
            <span key={tick.value} className="nf-numeric" style={{ bottom: `${(tick.value / top) * 100}%` }}>
              {tick.label}
            </span>
          ))}
        </div>
        <div
          className={["nf-viz__plot", "nf-viz-line", active !== null ? "is-active" : ""].filter(Boolean).join(" ")}
          style={{ height }}
          tabIndex={0}
          role="img"
          aria-label={summary ? `${label}. ${summary}` : label}
          {...handlers}
        >
          {points.map((p, i) =>
            p.value === null ? (
              <span
                key={p.key}
                className="nf-viz-gap"
                style={{ left: `${Math.max(0, pct(i) - 50 / Math.max(1, count - 1))}%`, width: `${100 / Math.max(1, count - 1)}%` }}
                aria-hidden="true"
              />
            ) : null,
          )}
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id={`nf-viz-clip-${uid}`}>
                <rect className="nf-viz-draw" x="0" y="-8" width={W} height={H + 16} />
              </clipPath>
            </defs>
            {yTicks.map((tick) => (
              <line
                key={tick.value}
                x1="0"
                x2={W}
                y1={yAt(tick.value)}
                y2={yAt(tick.value)}
                className={tick.value === 0 ? "nf-viz-svg-axis" : "nf-viz-svg-grid"}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <g clipPath={`url(#nf-viz-clip-${uid})`}>
              {compare ? (
                <path
                  d={compareLine}
                  fill="none"
                  stroke={CHART_CONTEXT}
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {area ? <path ref={areaRef} d={area} fill={CHART_SERIES} fillOpacity="0.1" /> : null}
              <path
                ref={lineRef}
                d={line}
                fill="none"
                stroke={CHART_SERIES}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>
          {compare && compareLast !== null ? (
            <span
              className="nf-viz-dot nf-viz-dot--context"
              style={{ left: `${pct(compareLast)}%`, top: `${yPct(compareValues[compareLast] ?? 0)}%` }}
              aria-hidden="true"
            />
          ) : null}
          {end && restIndex !== null ? (
            <>
              <span
                ref={dotRef}
                className="nf-viz-dot nf-viz-dot--end"
                style={{ left: `${pct(restIndex)}%`, top: endTop ?? undefined }}
                aria-hidden="true"
              />
              {active === null ? (
                <span
                  ref={endLabelRef}
                  className="nf-viz-endlabel nf-numeric"
                  data-side={sideOf(restIndex)}
                  style={{ left: `${pct(restIndex)}%`, top: endTop ?? undefined }}
                  aria-hidden="true"
                >
                  {say(end)}
                </span>
              ) : null}
            </>
          ) : null}
          {shown && active !== null ? (
            <>
              <span className="nf-viz-cross" style={{ left: `${pct(active)}%` }} aria-hidden="true" />
              {shown.value !== null ? (
                <span
                  className="nf-viz-dot"
                  style={{ left: `${pct(active)}%`, top: `${yPct(shown.value)}%` }}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className="nf-viz-readout"
                data-side={sideOf(active)}
                style={{ left: `${pct(active)}%` }}
                aria-hidden="true"
              >
                <span className="nf-viz-readout__value nf-numeric">{say(shown)}</span>
                {compare ? (
                  <span className="nf-viz-readout__row nf-numeric">
                    <span className="nf-viz-key nf-viz-key--line nf-viz-key--context" />
                    {compare.displays[active] ?? nullLabel ?? "–"}
                  </span>
                ) : null}
                <span className="nf-viz-readout__when">{shown.label}</span>
              </span>
            </>
          ) : null}
        </div>
        <div className="nf-viz__x nf-viz__x--points" aria-hidden="true">
          {points.map((p, i) => (
            <span key={p.key} style={{ left: `${pct(i)}%` }} data-side={sideOf(i)}>
              {showEvery(i, count, every) ? p.tick : ""}
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {readoutText}
      </p>
      <ChartTable
        caption={label}
        periodHead={periodHead}
        valueHead={seriesLabel ?? valueHead}
        compareHead={compare?.label}
        nullLabel={nullLabel}
        rows={points.map((p, i) => ({
          key: p.key,
          label: p.label,
          display: p.value === null ? null : (p.display ?? String(p.value)),
          compare: compare ? (compare.displays[i] ?? null) : undefined,
        }))}
      />
    </figure>
  );
}

/** The plot's own units: a 1000 by 300 viewBox stretched to the frame. */
const W = 1000;
const H = 300;

type Scale = { count: number; top: number; xAt: (i: number) => number; yAt: (v: number) => number };

function scaleOf(points: readonly VizPoint[], yTicks: readonly AxisTick[], compareValues: readonly (number | null)[]): Scale {
  const count = points.length;
  const top = scaleTop([...points, ...compareValues.map((value) => ({ value }))], yTicks);
  return {
    count,
    top,
    xAt: (i) => (count === 1 ? W / 2 : (i / (count - 1)) * W),
    yAt: (v) => H - (Math.max(0, v) / top) * H,
  };
}

function pathOf(scale: Scale, values: readonly (number | null)[], ys: readonly number[], rs: number[][]): string {
  return rs
    .map((run) =>
      run
        .map((i, k) => `${k === 0 ? "M" : "L"}${scale.xAt(i).toFixed(1)} ${scale.yAt(ys[i] ?? values[i] ?? 0).toFixed(1)}`)
        .join(" "),
    )
    .join(" ");
}

type Geometry = { line: string; area: string; endTop: string | null };

/** The line, its wash and the end marker's height for one set of values. */
function geometryOf(
  points: readonly VizPoint[],
  restIndex: number | null,
  scale: Scale,
  values: readonly number[],
): Geometry {
  const { xAt, yAt } = scale;
  const mainRuns = runs(points.map((p) => p.value));
  const area = mainRuns
    .filter((run) => run.length > 1)
    .map((run) => {
      const first = run[0]!;
      const last = run[run.length - 1]!;
      const edge = run.map((i, k) => `${k === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(values[i] ?? 0).toFixed(1)}`).join(" ");
      return `${edge} L${xAt(last).toFixed(1)} ${H} L${xAt(first).toFixed(1)} ${H} Z`;
    })
    .join(" ");
  const end = restIndex !== null ? points[restIndex] : undefined;
  return {
    line: pathOf(
      scale,
      points.map((p) => p.value),
      values,
      mainRuns,
    ),
    area,
    endTop: end && restIndex !== null ? `${(yAt(values[restIndex] ?? end.value ?? 0) / H) * 100}%` : null,
  };
}

/** Runs of consecutive recorded indices: the pieces a gap breaks a line into. */
export function runs(values: readonly (number | null)[]): number[][] {
  const out: number[][] = [];
  let current: number[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length) out.push(current);
      current = [];
    } else current.push(i);
  });
  if (current.length) out.push(current);
  return out;
}

function lastRecorded(values: readonly (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) if (values[i] !== null) return i;
  return null;
}

/**
 * Morphs between targets without rendering. React draws `target`; when the
 * target changes, the layout effect (before paint, so the new shape never
 * flashes) draws the frame the line was on and then each frame for MORPH_MS
 * on the glide curve through `write`, ending exactly on what React drew. The
 * first render is the target itself (the entrance is the clip's job), so the
 * server and the client agree on the first paint.
 */
function useMorph(target: readonly number[], write: (values: readonly number[]) => void): void {
  /* What is on screen right now, so an interrupted morph starts from where
     the line actually is rather than jumping back to the last target. */
  const live = useRef<readonly number[]>(target);
  const writeRef = useRef(write);
  /* The latest writer, kept current after each render and before the morph
     effect below reads it. */
  useLayoutEffect(() => {
    writeRef.current = write;
  });
  const signature = target.join(",");

  useLayoutEffect(() => {
    const next = signature === "" ? [] : signature.split(",").map(Number);
    const start = resample(live.current, next.length);
    if (motionQuiet() || (start.length === next.length && start.every((v, i) => v === next[i]))) {
      live.current = next;
      return;
    }
    let raf = 0;
    const began = performance.now();
    const draw = (values: readonly number[]) => {
      live.current = values;
      writeRef.current(values);
    };
    draw(start);
    const frame = (now: number) => {
      const t = Math.min(1, (now - began) / MORPH_MS);
      const e = glide(t);
      draw(t < 1 ? next.map((v, i) => start[i]! + (v - start[i]!) * e) : next);
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [signature]);
}
