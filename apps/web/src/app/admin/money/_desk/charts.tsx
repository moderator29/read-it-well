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

/**
 * THE BLUE RAMP, BY LIGHTNESS. One hue family, five rungs that step in
 * lightness rather than opacity, because opacity steps on one blue read as
 * one colour at a glance (measured on the first proof: three donut slices
 * were indistinguishable). Rank 0 is the largest or the first series. Every
 * rung is a semantic token with a light-theme twin.
 */
const RAMP = [
  "var(--nf-brand-primary)",
  "var(--nf-brand-quiet)",
  "var(--nf-brand-primary-strong)",
  "var(--nf-state-info)",
  "var(--nf-brand-tint-4)",
] as const;

export function rampColor(rank: number): string {
  return RAMP[Math.min(Math.max(0, Math.trunc(rank)), RAMP.length - 1)]!;
}

/**
 * Past the fifth rung the ramp runs out of honest lightness steps, so every
 * further slice is the fifth rung HATCHED, each at its own angle, and still
 * carries its word, share and count (research part four: never a sixth hue).
 */
export function isHatched(rank: number): boolean {
  return rank >= RAMP.length;
}
function hatchAngle(rank: number): number {
  return rank % 2 === 0 ? 45 : -45;
}
function swatchBackground(rank: number): string {
  if (!isHatched(rank)) return rampColor(rank);
  const a = hatchAngle(rank);
  return `repeating-linear-gradient(${a}deg, var(--nf-brand-quiet) 0 2px, transparent 2px 4px)`;
}

/**
 * Direct labels at the end of four lines collide where the lines end close
 * together (Hosts over Firms on the first proof). Push them apart to a
 * minimum gap, keeping their order, and keep them inside the plot.
 */
export function spreadLabels(ys: readonly number[], gap: number, top: number, bottom: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const placed: number[] = [];
  for (const [k, item] of order.entries()) {
    const prev = k === 0 ? -Infinity : placed[k - 1]!;
    placed.push(Math.max(item.y, prev + gap, top));
  }
  const overflow = (placed.at(-1) ?? 0) - bottom;
  if (overflow > 0) {
    for (let k = placed.length - 1; k >= 0; k -= 1) {
      const next = k === placed.length - 1 ? bottom : placed[k + 1]! - gap;
      placed[k] = Math.min(placed[k]!, next);
    }
  }
  const out = new Array<number>(ys.length);
  order.forEach((item, k) => {
    out[item.i] = placed[k]!;
  });
  return out;
}

/**
 * A smooth path through the points (monotone cubic, so the curve never
 * overshoots a value and never draws a dip or a peak the data does not have).
 */
export function smoothPath(pts: readonly [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length < 3) return `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")}`;
  const n = pts.length;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(pts[i + 1]![0] - pts[i]![0]);
    m.push((pts[i + 1]![1] - pts[i]![1]) / (dx[i] || 1));
  }
  const t: number[] = [m[0]!];
  for (let i = 1; i < n - 1; i += 1) t.push(m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2);
  t.push(m[n - 2]!);
  for (let i = 0; i < n - 1; i += 1) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i]! / m[i]!;
    const b = t[i + 1]! / m[i]!;
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      t[i] = k * a * m[i]!;
      t[i + 1] = k * b * m[i]!;
    }
  }
  let d = `M${pts[0]![0].toFixed(1)},${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const h = dx[i]! / 3;
    d += ` C${(x0 + h).toFixed(1)},${(y0 + t[i]! * h).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - t[i + 1]! * h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

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
  width = 720,
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
  /**
   * The drawing's width in its own units. Match it roughly to the card's CSS
   * width so the axis type lands near its CSS size: 720 for a full-width
   * panel, about 360 for the narrow column.
   */
  width?: number;
}) {
  const W = width;
  const H = height;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  /* A frame with no series draws its grid and axes and no data mark at all:
     no flat line through nothing. Its y axis names only the zero it can
     honestly name. */
  const ghost = series.every((s) => s.values.length === 0);
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
              <stop offset="0%" style={{ stopColor: rampColor(s.rank), stopOpacity: 0.5 }} />
              <stop offset="100%" style={{ stopColor: rampColor(s.rank), stopOpacity: 0.03 }} />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="nf-md-chart__grid" strokeWidth="1" />
            <text x={PAD.left - 10} y={y(t) + 4} textAnchor="end" className="nf-md-chart__axis">
              {ghost && t !== 0 ? "" : yLabel(t)}
            </text>
          </g>
        ))}
        {xLabels.map((l, i) =>
          i === n - 1 || (i % labelEvery === 0 && n - 1 - i >= labelEvery * 0.7) ? (
            <text key={`${l}-${i}`} x={x(i)} y={H - 8} textAnchor="middle" className="nf-md-chart__axis">
              {l}
            </text>
          ) : null,
        )}

        {series.filter((s) => s.values.length > 0).map((s, si, drawn) => {
          const labelYs = spreadLabels(
            drawn.map((d) => y(d.values[n - 1] ?? 0) - 8),
            14,
            PAD.top + 8,
            PAD.top + plotH - 2,
          );
          const line = smoothPath(s.values.map((v, i) => [x(i), y(v)] as [number, number]));
          const area = `${line} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
          const colour = rampColor(s.rank);
          return (
            <g key={s.name}>
              {s.area && n > 1 && <path d={area} fill={`url(#${id}-${s.rank})`} />}
              {n > 1 ? (
                <path
                  d={line}
                  fill="none"
                  style={{ stroke: colour }}
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
                  style={{ fill: colour }}
                />
              ))}
              {directLabels && n > 0 && (
                <text
                  x={x(n - 1) - 4}
                  y={labelYs[si]}
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
      {!ghost && <ChartReadout columns={readout} plotLeft={PAD.left / W} plotRight={(W - PAD.right) / W} />}
      {!ghost && <table className="sr-only">
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
      </table>}
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
              style={{ stroke: rampColor(s.rank) }}
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
        <defs>
          {arcs.filter((a) => isHatched(a.rank)).map((a) => (
            <pattern
              key={a.key}
              id={`hatch-${label.replace(/[^a-z0-9]/gi, "")}-${a.rank}`}
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
              patternTransform={`rotate(${hatchAngle(a.rank)})`}
            >
              <rect width="2" height="4" style={{ fill: "var(--nf-brand-quiet)" }} />
            </pattern>
          ))}
        </defs>
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
                style={{
                  stroke: isHatched(a.rank)
                    ? `url(#hatch-${label.replace(/[^a-z0-9]/gi, "")}-${a.rank})`
                    : rampColor(a.rank),
                }}
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
              style={{ background: swatchBackground(rank) }}
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

/** The ranked bars' frame with nothing in it: five numbered empty tracks. */
export function RankFrame({ rows = 5 }: { rows?: number }) {
  return (
    <ol className="nf-md-bars">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="nf-md-bar">
          <span className="nf-md-bar__rank">{i + 1}.</span>
          <span className="text-[var(--nf-content-muted)]">&nbsp;</span>
          <span className="nf-md-bar__track" />
          <span className="nf-md-bar__count">&nbsp;</span>
        </li>
      ))}
    </ol>
  );
}

export type StatusTone4 = "good" | "bad" | "pending" | "info";

/**
 * One stacked status bar on the status four (emerald good, rose bad, cyan
 * pending, blue info), a WORD on every segment wide enough to hold one and a
 * key under the bar that names every segment with its count either way. With
 * nothing to show it draws the empty track and the key at zero.
 */
export function StatusBar({
  segments,
  label,
}: {
  segments: { key: string; label: string; count: number; tone: StatusTone4 }[];
  label: string;
}) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  const shown = segments.filter((s) => s.count > 0);
  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.count}`).join(", ")}, ${total} in total.`}
        className={`nf-md-statusbar${total === 0 ? " nf-md-statusbar--empty" : ""}`}
      >
        {shown.map((s) => (
          <span
            key={s.key}
            className={`nf-md-statusbar__seg nf-md-statusbar__seg--${s.tone}`}
            style={{ flexGrow: s.count, flexBasis: 0 }}
          >
            {s.count / total >= 0.07 ? s.label : s.count / total >= 0.025 ? s.count : ""}
          </span>
        ))}
      </div>
      <figcaption className="nf-md-statuskey">
        {segments.map((s) => (
          <span key={s.key} className="nf-md-statuskey__item">
            <span aria-hidden="true" className={`nf-md-swatch nf-md-swatch--square nf-md-statusbar__seg--${s.tone}`} />
            {s.label}
            <span className="nf-md-statuskey__count">{s.count}</span>
          </span>
        ))}
      </figcaption>
    </figure>
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
