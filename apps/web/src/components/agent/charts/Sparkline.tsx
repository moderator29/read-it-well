import { CHART_SERIES } from "@/components/ui/charts/palette";

/**
 * A stat tile's sparkline: one series, a line and a fading fill, the last
 * point marked. Pure SVG and no hooks, so it renders on the server.
 *
 * It draws only what it is handed. Fewer than two points is not a line and
 * returns nothing; a series that is all zero is drawn as the flat floor it
 * is, never lifted into a shape. The caller decides whether a series exists.
 *
 * The gradient id is derived from `id`, which the caller must keep unique on
 * the page: two tiles sharing an id would share a fill.
 */
export type SparkTone = "brand" | "success" | "error";

const TONE_INK: Record<SparkTone, string> = {
  brand: CHART_SERIES,
  success: "var(--nf-state-success)",
  error: "var(--nf-state-error)",
};

export function Sparkline({
  id,
  values,
  label,
  tone = "brand",
  width = 120,
  height = 40,
  className,
}: {
  id: string;
  values: readonly number[];
  label: string;
  tone?: SparkTone;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) return null;
  const ink = TONE_INK[tone];
  const pad = 3;
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const span = max - min;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = span === 0 ? height - pad : height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1]!;
  const area = `${line} L${last[0].toFixed(1)} ${height} L${pts[0]![0].toFixed(1)} ${height} Z`;
  const fillId = `nf-spark-${id.replace(/[^a-zA-Z0-9-]+/g, "-")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ink} stopOpacity="0.34" />
          <stop offset="100%" stopColor={ink} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path
        d={line}
        fill="none"
        stroke={ink}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${ink})` }}
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={ink} />
    </svg>
  );
}
