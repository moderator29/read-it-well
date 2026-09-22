"use client";

import { useState, type PointerEvent } from "react";

/**
 * THE HOVER READOUT, AND NOTHING ELSE ON THE CLIENT.
 *
 * The chart is drawn on the server as plain SVG; this layer sits over its
 * plot area and owns only the pointer position. The readout text arrives
 * already formatted (money through the shared formatter, on the server), so
 * no number is computed here and nothing a reader sees depends on script. A
 * keyboard reader gets the same figures from the table the chart carries
 * under it for assistive technology.
 */
export type ReadoutColumn = {
  title: string;
  rows: { label: string; value: string }[];
};

export function ChartReadout({
  columns,
  /** The plot area's left and right edges as fractions of the chart's width. */
  plotLeft,
  plotRight,
}: {
  columns: ReadoutColumn[];
  plotLeft: number;
  plotRight: number;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const count = columns.length;
  if (count === 0) return null;

  const xAt = (i: number) =>
    count === 1 ? (plotLeft + plotRight) / 2 : plotLeft + (i / (count - 1)) * (plotRight - plotLeft);

  function track(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    const fraction = (event.clientX - box.left) / box.width;
    const within = (fraction - plotLeft) / Math.max(0.0001, plotRight - plotLeft);
    const i = Math.round(Math.min(1, Math.max(0, within)) * (count - 1));
    setIndex(i);
  }

  const active = index === null ? null : columns[index];
  const x = index === null ? 0 : xAt(index);

  return (
    <div
      className="nf-md-readout-layer"
      onPointerMove={track}
      onPointerDown={track}
      onPointerLeave={() => setIndex(null)}
      aria-hidden="true"
    >
      {active && (
        <>
          <span className="nf-md-readout-line" style={{ left: `${x * 100}%` }} />
          <span
            className="nf-md-readout"
            style={
              x > 0.6
                ? { right: `${(1 - x) * 100}%`, marginRight: "0.75rem" }
                : { left: `${x * 100}%`, marginLeft: "0.75rem" }
            }
          >
            <span className="nf-md-readout__title block">{active.title}</span>
            {active.rows.map((row) => (
              <span key={row.label} className="nf-md-readout__row">
                <span>{row.label}</span>
                <span>{row.value}</span>
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  );
}
