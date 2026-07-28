/**
 * Donut chart for booking sources.
 *
 * Pure SVG. Segments carry an explicit hue from the data, so colour is
 * meaningful and consistent, not decorative. The centre shows the total; a
 * legend beside it names each segment with its share, so the chart never relies
 * on colour alone to be understood (accessibility). The legend sits beside the
 * ring where the card is wide enough and wraps beneath it on narrow phones, so
 * labels never truncate into meaninglessness.
 */
export function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; count: number; hue: string }[];
  centerLabel: string;
  centerValue: number;
}) {
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;
  const r = 54;
  const c = 2 * Math.PI * r;
  const gap = 2; // px gap between segments

  let offset = 0;
  const arcs = segments.map((s) => {
    const frac = s.count / total;
    const len = Math.max(0, frac * c - gap);
    const arc = { hue: s.hue, dash: `${len} ${c - len}`, off: -offset };
    offset += frac * c;
    return arc;
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0" role="img" aria-label={`${centerLabel}: ${centerValue}`}>
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--nf-border-subtle)" strokeWidth="14" />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={a.hue}
              strokeWidth="14"
              strokeDasharray={a.dash}
              strokeDashoffset={a.off}
              strokeLinecap="round"
            />
          ))}
        </g>
        <text x="70" y="66" textAnchor="middle" className="nf-numeric" fontSize="22" fontWeight="800" fill="var(--nf-content-primary)">
          {centerValue}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="9" fill="var(--nf-content-muted)">
          {centerLabel}
        </text>
      </svg>

      <ul className="min-w-0 flex-1 basis-48 space-y-2">
        {segments.map((s) => {
          const pct = Math.round((s.count / total) * 100);
          return (
            <li key={s.label} className="flex items-center gap-2 text-[0.8125rem]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.hue }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[var(--nf-content-secondary)]">{s.label}</span>
              <span className="nf-numeric shrink-0 font-semibold text-[var(--nf-content-primary)]">
                {s.count} <span className="text-[var(--nf-content-muted)]">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
