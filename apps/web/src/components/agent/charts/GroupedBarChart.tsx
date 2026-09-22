"use client";

import { useState } from "react";
import type { AxisTick } from "./AreaTimeChart";

/**
 * Vertical bars grouped by bucket (a month), up to three series side by side.
 *
 * THE SERIES ARE NOT TOLD APART BY HUE. A four-slot categorical palette cannot
 * exist inside the colour law (docs/research/UI_UNIQUENESS_AND_ADMIN_RESEARCH.md
 * section 4.2), so the series are one blue ramp by strength (full, two thirds,
 * a third) and the third also carries a hatch, the legend names every series
 * in words beside its swatch, and the hover readout lists each value by name.
 * Identity never rests on colour alone.
 *
 * Bars are HTML boxes rather than SVG, so a bar's corner radius and the type
 * around it stay true at every width. Hover or focus a group for its readout;
 * arrow keys walk the groups.
 */
export type BarSeries = { key: string; label: string };
export type BarGroup = { key: string; tick: string; readout: string; values: readonly number[] };

export function GroupedBarChart({
  series,
  groups,
  yTicks,
  label,
  height = 200,
  format = (n) => String(n),
}: {
  series: readonly BarSeries[];
  groups: readonly BarGroup[];
  yTicks: readonly AxisTick[];
  label: string;
  height?: number;
  format?: (value: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (groups.length === 0 || series.length === 0) return null;
  const top = Math.max(...yTicks.map((t) => t.value), ...groups.flatMap((g) => g.values), 1);

  return (
    <figure className="nf-chart" aria-label={label}>
      <ul className="nf-chart__legend" aria-label="Series">
        {series.map((s, i) => (
          <li key={s.key}>
            <span className={`nf-chart__swatch nf-chart__bar--s${i}`} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="nf-chart__frame">
        <div className="nf-chart__yaxis" aria-hidden="true" style={{ height }}>
          {yTicks.map((tick) => (
            <span key={tick.value} style={{ bottom: `${(tick.value / top) * 100}%` }}>
              {tick.label}
            </span>
          ))}
        </div>
        <div
          className="nf-chart__plot nf-chart__plot--bars"
          style={{ height }}
          onPointerLeave={() => setActive(null)}
        >
          {yTicks.map((tick) => (
            <span
              key={tick.value}
              className="nf-chart__grid"
              style={{ bottom: `${(tick.value / top) * 100}%` }}
              aria-hidden="true"
            />
          ))}
          {groups.map((group, gi) => (
            <div
              key={group.key}
              className={`nf-chart__group${active === gi ? " is-on" : ""}`}
              tabIndex={0}
              role="img"
              aria-label={`${group.readout}: ${series.map((s, si) => `${s.label} ${format(group.values[si] ?? 0)}`).join(", ")}`}
              onPointerEnter={() => setActive(gi)}
              onFocus={() => setActive(gi)}
              onBlur={() => setActive(null)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const next = event.currentTarget[
                  event.key === "ArrowLeft" ? "previousElementSibling" : "nextElementSibling"
                ] as HTMLElement | null;
                next?.focus();
              }}
            >
              {series.map((s, si) => {
                const value = group.values[si] ?? 0;
                return (
                  <span
                    key={s.key}
                    className={`nf-chart__bar nf-chart__bar--s${si}`}
                    style={{ height: `${(value / top) * 100}%` }}
                  />
                );
              })}
              {active === gi && (
                <span
                  className="nf-chart__readout nf-chart__readout--bars"
                  data-side={gi > groups.length * 0.66 ? "left" : "right"}
                  role="status"
                >
                  <span className="nf-chart__readout-when">{group.readout}</span>
                  {series.map((s, si) => (
                    <span key={s.key} className="nf-chart__readout-row">
                      <span className={`nf-chart__swatch nf-chart__bar--s${si}`} aria-hidden="true" />
                      {s.label}
                      <b>{format(group.values[si] ?? 0)}</b>
                    </span>
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="nf-chart__xaxis nf-chart__xaxis--bars" aria-hidden="true">
        {groups.map((group) => (
          <span key={group.key}>{group.tick}</span>
        ))}
      </div>
    </figure>
  );
}
