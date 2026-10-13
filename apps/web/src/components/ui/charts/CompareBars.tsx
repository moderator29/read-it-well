import type { CSSProperties } from "react";
import "@/app/css/charts.css";
import { CHART_CONTEXT, CHART_SERIES } from "./palette";

/**
 * COMPARE BARS: "this period against the last one" (chart rule 1, north star
 * 15.3's comparison done as lengths). Each row is one measure; under its
 * label sit two thin horizontal bars, the current period in the series ink
 * and the previous one in the grey context ink, hatched, each followed by its
 * own figure. A legend above names the two periods.
 *
 * Every value is printed beside its bar, so there is nothing a tooltip would
 * add and nothing a hidden table would hold that the reader cannot already
 * see: the rows ARE the table, marked up as a description list.
 *
 * The two bars of a row share one scale (the larger of the pair), so a row
 * compares a measure with itself and never with a different measure in
 * another row: "guests paid" and "stays" are not on one axis, and putting
 * them there would be the dual-axis mistake in a different shape.
 *
 * Never against another member and never ranked (north star 15.3). A row
 * whose previous value is null is drawn with the current bar only and the
 * previous figure says so in the caller's words.
 *
 * Server-safe. The bars grow from the start edge, 620ms, 30ms apart.
 */
export type CompareRow = {
  key: string;
  label: string;
  current: number;
  currentDisplay: string;
  /** Null when the previous period has nothing on record. */
  previous: number | null;
  previousDisplay: string;
};

export function CompareBars({
  rows,
  currentLabel,
  previousLabel,
  label,
  className,
}: {
  rows: readonly CompareRow[];
  /** The two periods' names, for the legend ("This month", "Last month"). */
  currentLabel: string;
  previousLabel: string;
  /** Names the comparison for assistive tech. */
  label: string;
  className?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <figure className={["nf-viz nf-viz-compare", className ?? ""].filter(Boolean).join(" ")}>
      <ul className="nf-viz__legend" aria-hidden="true">
        <li>
          <span className="nf-viz-key" style={{ background: CHART_SERIES }} />
          {currentLabel}
        </li>
        <li>
          <span className="nf-viz-key nf-viz-key--hatch" />
          {previousLabel}
        </li>
      </ul>
      <dl aria-label={label} className="nf-viz-compare__list">
        {rows.map((row, i) => {
          const scale = Math.max(row.current, row.previous ?? 0, 1);
          return (
            <div key={row.key} className="nf-viz-compare__row">
              <dt className="nf-viz-compare__label">{row.label}</dt>
              <dd className="nf-viz-compare__pair">
                <span className="nf-viz-compare__line">
                  <span className="sr-only">{currentLabel}: </span>
                  <span className="nf-viz-compare__track" aria-hidden="true">
                    {row.current > 0 ? (
                      <span
                        className="nf-viz-hbar"
                        style={
                          {
                            "--nf-viz-v": (row.current / scale).toFixed(4),
                            "--nf-viz-i": i * 2,
                            background: CHART_SERIES,
                          } as CSSProperties
                        }
                      />
                    ) : null}
                  </span>
                  <span className="nf-viz-compare__figure nf-numeric">{row.currentDisplay}</span>
                </span>
                <span className="nf-viz-compare__line">
                  <span className="sr-only">{previousLabel}: </span>
                  <span className="nf-viz-compare__track" aria-hidden="true">
                    {row.previous !== null && row.previous > 0 ? (
                      <span
                        className="nf-viz-hbar nf-viz-hbar--context"
                        style={
                          {
                            "--nf-viz-v": (row.previous / scale).toFixed(4),
                            "--nf-viz-i": i * 2 + 1,
                            color: CHART_CONTEXT,
                          } as CSSProperties
                        }
                      />
                    ) : null}
                  </span>
                  <span className="nf-viz-compare__figure nf-viz-compare__figure--context nf-numeric">
                    {row.previousDisplay}
                  </span>
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </figure>
  );
}
