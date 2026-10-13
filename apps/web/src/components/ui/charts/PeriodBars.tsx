"use client";

import type { CSSProperties, ReactNode } from "react";
import "@/app/css/charts.css";
import {
  allAbsent,
  peakIndex,
  scaleTop,
  showEvery,
  tickEveryFor,
  widest,
  type AxisTick,
  type VizPoint,
} from "./chart-rules";
import { ChartTable } from "./ChartTable";
import { useChartReadout } from "./useChartReadout";

/**
 * PERIOD BARS: "how much in each period" (chart rule 1). Reference 7056's
 * earnings bars and 7083's bento tile, on the one blue.
 *
 * One series, so no legend: the title names it. Every recorded bar is the
 * series ink; nominal periods are never coloured by their value. At rest the
 * `emphasis` bar carries a direct label at its tip (the peak, or the current
 * period); under the pointer the other bars recede so the one being read
 * stands forward, and the readout names it.
 *
 * THE THREE STATES OF A PERIOD (chart rule 4): null is a hatched slot the
 * full height of the plot, "nothing on record"; zero is no bar, the baseline
 * showing; anything above zero is a bar no shorter than 2px. When every
 * period is null the frame stays, the slots are hatched, and `empty` says in
 * words why and what fills it: the sparse state a young platform shows most.
 *
 * GEOMETRY IS TRANSFORM ONLY. Each bar is the full height of its slot and is
 * translated down until only its value shows, the slot clipping the rest.
 * That keeps the 4px top corners true at every height (a scaleY would squash
 * them), keeps the base square, and lets the entrance (grow from the
 * baseline, 620ms, 30ms apart) and a period morph (380ms) both be one
 * transform. `app/css/charts.css` carries the motion and its quiet answers.
 *
 * The y ticks arrive printed (`axisTicks` on the server), because a client
 * component cannot be handed a formatter function across the RSC boundary.
 */
export function PeriodBars({
  points,
  yTicks,
  label,
  summary,
  periodHead,
  valueHead,
  nullLabel,
  emphasis = "peak",
  empty,
  target,
  height = 176,
  className,
}: {
  points: readonly VizPoint[];
  yTicks: readonly AxisTick[];
  /** Names the series; the table's caption and the plot's accessible name. */
  label: string;
  /** The chart in one sentence, appended to the accessible name. */
  summary?: string;
  /** The table's column heads ("Month", "Your share"). */
  periodHead: string;
  valueHead: string;
  /** How the table prints a null. */
  nullLabel?: string;
  /** Which bar is labelled at rest: the peak, the last recorded, an index, or none. */
  emphasis?: "peak" | "last" | number | null;
  /** Said over the hatched slots when nothing is on record. */
  empty?: ReactNode;
  /** A promise the product keeps, drawn dashed and named. Only where one exists. */
  target?: { value: number; label: string };
  height?: number;
  className?: string;
}) {
  const count = points.length;
  const absent = allAbsent(points);
  const restIndex = absent
    ? null
    : emphasis === "peak"
      ? peakIndex(points)
      : emphasis === "last"
        ? lastRecorded(points)
        : typeof emphasis === "number" && points[emphasis]?.value != null
          ? emphasis
          : null;
  const { active, handlers } = useChartReadout(count, restIndex ?? lastRecorded(points), true);

  if (count === 0) return null;

  const top = scaleTop(points, target ? [...yTicks, { value: target.value, label: target.label }] : yTicks);
  const every = tickEveryFor(count);
  const shown = active !== null ? points[active] : null;
  const colPct = 100 / count;
  /* A readout or tip near an edge hangs inwards rather than off the card. */
  const sideOf = (i: number) => {
    const at = count > 1 ? i / (count - 1) : 0.5;
    return at < 0.2 ? "start" : at > 0.8 ? "end" : "mid";
  };
  const readoutText = shown
    ? `${shown.label}: ${shown.value === null ? (nullLabel ?? "–") : (shown.display ?? String(shown.value))}`
    : "";

  return (
    <figure className={["nf-viz", className ?? ""].filter(Boolean).join(" ")}>
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
          className={["nf-viz__plot", "nf-viz-bars", active !== null ? "is-active" : "", absent ? "is-absent" : ""]
            .filter(Boolean)
            .join(" ")}
          style={{ height }}
          /* With nothing on record there is nothing to read point by point:
             no tab stop, no image role, and the words below are plain text. */
          {...(absent
            ? {}
            : { tabIndex: 0, role: "img", "aria-label": summary ? `${label}. ${summary}` : label, ...handlers })}
        >
          {yTicks.map((tick) =>
            tick.value === 0 ? null : (
              <span
                key={tick.value}
                className="nf-viz__grid"
                style={{ bottom: `${(tick.value / top) * 100}%` }}
                aria-hidden="true"
              />
            ),
          )}
          {points.map((point, i) => {
            const v = point.value;
            const on = active === i;
            return (
              <div
                key={point.key}
                className={["nf-viz-col", v === null ? "is-empty" : "", on ? "is-on" : ""].filter(Boolean).join(" ")}
                aria-hidden="true"
              >
                <span className="nf-viz-col__slot">
                  {v !== null && v > 0 ? (
                    <span
                      className="nf-viz-bar"
                      style={{ "--nf-viz-v": (v / top).toFixed(4), "--nf-viz-i": i } as CSSProperties}
                    />
                  ) : null}
                </span>
                {restIndex === i && active === null && v !== null ? (
                  <span
                    className="nf-viz-tip nf-numeric"
                    data-side={sideOf(i)}
                    style={{ bottom: `${(Math.max(v, 0) / top) * 100}%` }}
                  >
                    {point.display ?? String(v)}
                  </span>
                ) : null}
              </div>
            );
          })}
          {target ? (
            <span className="nf-viz__target" style={{ bottom: `${(target.value / top) * 100}%` }} aria-hidden="true">
              <span className="nf-viz__target-label">{target.label}</span>
            </span>
          ) : null}
          {absent && empty ? <p className="nf-viz__empty">{empty}</p> : null}
          {shown ? (
            <span
              className="nf-viz-readout"
              data-side={sideOf(active!)}
              style={{ left: `${(active! + 0.5) * colPct}%` }}
              aria-hidden="true"
            >
              <span className="nf-viz-readout__value nf-numeric">
                {shown.value === null ? (nullLabel ?? "–") : (shown.display ?? String(shown.value))}
              </span>
              <span className="nf-viz-readout__when">{shown.label}</span>
            </span>
          ) : null}
        </div>
        <div className="nf-viz__x" aria-hidden="true">
          {points.map((point, i) => (
            <span key={point.key}>{showEvery(i, count, every) ? point.tick : ""}</span>
          ))}
        </div>
      </div>
      {/* The readout, said: a keyboard reader hears what a sighted one sees. */}
      <p className="sr-only" aria-live="polite">
        {readoutText}
      </p>
      {absent ? null : (
        <ChartTable
          caption={label}
          periodHead={periodHead}
          valueHead={valueHead}
          nullLabel={nullLabel}
          rows={points.map((p) => ({
            key: p.key,
            label: p.label,
            display: p.value === null ? null : (p.display ?? String(p.value)),
          }))}
        />
      )}
    </figure>
  );
}

function lastRecorded(points: readonly VizPoint[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) if (points[i]!.value !== null) return i;
  return null;
}
