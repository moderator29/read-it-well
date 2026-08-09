/**
 * A small area chart for a stat card: brand-blue line with a soft fill
 * underneath, the same polyline-from-values math as the wallet sparkline,
 * generalised so any ordered series of numbers can be dropped in.
 *
 * Pure SVG, no charting dependency. Server-renderable; nothing here needs
 * client interactivity.
 */
export function StatChart({
  values,
  className,
  tone = "brand",
}: {
  /** Ordered series, oldest first. Fewer than two points renders nothing. */
  values: number[];
  className?: string;
  tone?: "brand" | "success";
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 32 - ((v - min) / span) * 28;
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,32 ${line} 100,32`;
  const gradientId = `nf-statchart-${tone}`;
  const strokeVar = tone === "success" ? "var(--nf-state-success)" : "var(--nf-brand-secondary)";

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className={`nf-statchart ${className ?? ""}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeVar} stopOpacity="0.35" />
          <stop offset="100%" stopColor={strokeVar} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={strokeVar}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
