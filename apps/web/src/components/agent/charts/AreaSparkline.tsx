/**
 * Area sparkline for the earnings overview.
 *
 * Pure SVG, no charting library (Master Rule 52, no unnecessary dependencies).
 * Deterministic geometry so server and client render identically. The line
 * carries the agent-mode blue; the fill fades to transparent. Sizing is
 * responsive: the chart takes the container's width and its height follows the
 * viewBox aspect, capped at `height`, so it stays compact on phones without a
 * fixed pixel box forcing tall empty cards.
 */
export function AreaSparkline({
  data,
  label,
  height = 220,
  className,
}: {
  data: number[];
  label: string;
  height?: number;
  className?: string;
}) {
  const w = 640;
  const h = height;
  const pad = 8;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1]![0].toFixed(1)} ${h} L${pts[0]![0].toFixed(1)} ${h} Z`;
  const last = pts[pts.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      style={{ width: "100%", height: "auto", maxHeight: height }}
    >
      <defs>
        <linearGradient id="nf-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--nf-mode-agent)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--nf-mode-agent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#nf-spark-fill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--nf-mode-agent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="4" fill="var(--nf-mode-agent)" />
    </svg>
  );
}
