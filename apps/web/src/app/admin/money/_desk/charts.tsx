import { rampAlpha } from "@/components/ui/charts/palette";
import { ChartReadout, type ReadoutColumn } from "./ChartReadout";

/**
 * The money desks' charts: inline SVG drawn on the server, no dependency.
 *
 * LOCAL UNTIL THE SHARED PRIMITIVES LAND. The founder's update puts the
 * console's chart primitives in `components/agent/charts/`, built by
 * admin-shell. When they arrive these switch over; until then they follow the
 * same law: one blue family, a ramp by magnitude instead of a fourth hue, a
 * word beside every colour, and no chart at all where the data behind it does
 * not exist.
 *
 * Every figure a reader sees on hover is formatted on the server and handed
 * down as text (`ChartReadout`), and every chart carries a visually hidden
 * table of the same figures for assistive technology.
 */

/** The next "nice" ceiling: 1, 2, 2.5 or 5 times a power of ten. */
export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * power;
}

export type Series = {
  name: string;
  values: number[];
  /** 0 is the strongest rung of the blue ramp. */
  rank: number;
  /** Draw a filled area under the line. */
  area?: boolean;
  /** A dash pattern, so identity never rests on colour alone. */
  dash?: string;
};

const W = 720;
const PAD = { left: 64, right: 16, top: 16, bottom: 30 };

export function SeriesChart({
  id,
  xLabels,
  series,
  yLabel,
  readout,
  height = 240,
  label,
  directLabels = false,
}: {
  /** Unique on the page, for the gradient ids. */
  id: string;
  xLabels: string[];
  series: Series[];
  /** Formats a y-axis figure. Runs on the server only. */
  yLabel: (value: number) => string;
  readout: ReadoutColumn[];
  height?: number;
  /** What the chart shows, for assistive technology. */
  label: string;
  /** Print each series' name at its last point. */
  directLabels?: boolean;
}) {
  const H = height;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = niceCeil(Math.max(0, ...series.flatMap((s) => s.values)));
  const n = xLabels.length;
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = n > 8 ? Math.ceil(n / 8) : 1;

  return (
    <figure className="nf-md-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        <defs>
          {series.map((s) => (
            <linearGradient key={s.name} id={`${id}-${s.rank}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--nf-brand-primary)", stopOpacity: 0.55 * rampAlpha(s.rank) }} />
              <stop offset="100%" style={{ stopColor: "var(--nf-brand-primary)", stopOpacity: 0.04 }} />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="nf-md-chart__grid" strokeWidth="1" />
            <text x={PAD.left - 10} y={y(t) + 4} textAnchor="end" className="nf-md-chart__axis">
              {yLabel(t)}
            </text>
          </g>
        ))}
        {xLabels.map((l, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={`${l}-${i}`} x={x(i)} y={H - 8} textAnchor="middle" className="nf-md-chart__axis">
              {l}
            </text>
          ) : null,
        )}

        {series.map((s) => {
          const points = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
          const line = `M${points.join(" L")}`;
          const area = `${line} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
          const alpha = rampAlpha(s.rank);
          return (
            <g key={s.name}>
              {s.area && n > 1 && <path d={area} fill={`url(#${id}-${s.rank})`} />}
              {n > 1 ? (
                <path
                  d={line}
                  fill="none"
                  style={{ stroke: s.rank === 0 ? "var(--nf-brand-primary)" : "var(--nf-brand-quiet)", strokeOpacity: alpha }}
                  strokeWidth="2.25"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dash}
                />
              ) : null}
              {s.values.map((v, i) => (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(v)}
                  r={n > 12 ? 0 : 3}
                  style={{ fill: s.rank === 0 ? "var(--nf-brand-primary)" : "var(--nf-brand-quiet)", fillOpacity: alpha }}
                />
              ))}
              {directLabels && n > 0 && (
                <text
                  x={x(n - 1) - 4}
                  y={y(s.values[n - 1] ?? 0) - 8}
                  textAnchor="end"
                  className="nf-md-chart__axis"
                >
                  {s.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ChartReadout columns={readout} plotLeft={PAD.left / W} plotRight={(W - PAD.right) / W} />
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {readout.map((col) => (
            <tr key={col.title}>
              <th scope="row">{col.title}</th>
              {col.rows.map((row) => (
                <td key={row.label}>{row.value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** A legend for two to four series: swatch, dash sample and the word. */
export function SeriesLegend({ series }: { series: Pick<Series, "name" | "rank" | "dash">[] }) {
  return (
    <ul className="nf-md-legend">
      {series.map((s) => (
        <li key={s.name} className="nf-md-legend__item">
          <svg width="22" height="10" aria-hidden="true">
            <line
              x1="1"
              x2="21"
              y1="5"
              y2="5"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={s.dash}
              style={{ stroke: s.rank === 0 ? "var(--nf-brand-primary)" : "var(--nf-brand-quiet)", strokeOpacity: rampAlpha(s.rank) }}
            />
          </svg>
          {s.name}
        </li>
      ))}
    </ul>
  );
}

/** Arc lengths and offsets for a donut of radius `r`, largest slice first. */
export function donutArcs(slices: { label: string; count: number }[], r: number) {
  const ordered = [...slices].sort((a, b) => b.count - a.count);
  const total = ordered.reduce((s, x) => s + x.count, 0);
  const c = 2 * Math.PI * r;
  const gap = ordered.filter((s) => s.count > 0).length > 1 ? 3 : 0;
  const starts = ordered.map((_, i) =>
    ordered.slice(0, i).reduce((sum, s) => sum + (total > 0 ? (s.count / total) * c : 0), 0),
  );
  const arcs = ordered.map((s, rank) => {
    const frac = total > 0 ? s.count / total : 0;
    const len = Math.max(0, frac * c - gap);
    return { key: s.label, rank, dash: `${len} ${c - len}`, off: -(starts[rank] ?? 0), show: s.count > 0 };
  });
  return { ordered, arcs };
}

/**
 * A donut on the blue ramp, ordered by size, every slice named with its share
 * and count. The renders' teal, mauve and pink slices are translated here: a
 * fourth hue cannot be made to pass the colour law (research part four), so
 * rank carries the difference and the word carries the meaning.
 */
export function Donut({
  slices,
  totalLabel,
  totalValue,
  label,
}: {
  slices: { label: string; count: number }[];
  totalLabel: string;
  totalValue: string;
  label: string;
}) {
  const r = 52;
  const { ordered, arcs } = donutArcs(slices, r);
  const total = ordered.reduce((s, x) => s + x.count, 0);

  return (
    <div className="nf-md-donut">
      <svg viewBox="0 0 140 140" className="nf-md-donut__svg" role="img" aria-label={label}>
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" style={{ stroke: "var(--nf-brand-tint-1)" }} />
          {arcs.map((a) =>
            a.show ? (
              <circle
                key={a.key}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                strokeWidth="16"
                strokeDasharray={a.dash}
                strokeDashoffset={a.off}
                style={{ stroke: "var(--nf-brand-primary)", strokeOpacity: rampAlpha(a.rank) }}
              />
            ) : null,
          )}
        </g>
        <text x="70" y="62" textAnchor="middle" fontSize="11" className="nf-md-donut__caption">
          {totalLabel}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="22" className="nf-md-donut__total">
          {totalValue}
        </text>
      </svg>
      <ul className="nf-md-slices">
        {ordered.map((s, rank) => (
          <li key={s.label} className="nf-md-slice">
            <span
              className="nf-md-swatch nf-md-swatch--square"
              aria-hidden="true"
              style={{ background: "var(--nf-brand-primary)", opacity: rampAlpha(rank) }}
            />
            <span className="truncate">{s.label}</span>
            <span className="nf-md-slice__share">{total > 0 ? `${Math.round((s.count / total) * 100)}%` : "0%"}</span>
            <span className="nf-md-slice__count">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A single-figure ring: the share drawn as an arc on a quiet track. */
export function Ring({
  percent,
  tone,
  label,
}: {
  percent: number | null;
  tone: "good" | "bad" | "quiet";
  label: string;
}) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const value = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const len = (value / 100) * c;
  const stroke =
    tone === "good" ? "var(--nf-state-success)" : tone === "bad" ? "var(--nf-state-error)" : "var(--nf-content-muted)";
  return (
    <svg viewBox="0 0 100 100" className="nf-md-ring__svg" role="img" aria-label={label}>
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" style={{ stroke: "var(--nf-brand-tint-1)" }} />
      {percent !== null && (
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeDasharray={`${len} ${c - len}`}
          transform="rotate(-90 50 50)"
          style={{ stroke }}
        />
      )}
      <text x="50" y="57" textAnchor="middle" fontSize="20" className="nf-md-ring__figure">
        {percent === null ? "none" : `${percent}%`}
      </text>
    </svg>
  );
}

/** Ranked horizontal bars, one series, direct-labelled. */
export function RankBars({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ol className="nf-md-bars">
      {rows.map((row, i) => (
        <li key={row.label} className="nf-md-bar">
          <span className="nf-md-bar__rank">{i + 1}.</span>
          <span className="truncate">{row.label}</span>
          <span className="nf-md-bar__track" aria-hidden="true">
            <span className="nf-md-bar__fill" style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <span className="nf-md-bar__count">{row.count}</span>
        </li>
      ))}
    </ol>
  );
}
