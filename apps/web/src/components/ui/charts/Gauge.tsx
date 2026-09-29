import type { ReactNode } from "react";
import { TONE_FILL, TRACK_FILL, type ChartTone } from "./palette";

/**
 * THE PIPELINE GAUGE (the clean unified sweep, 29 September 2026;
 * `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 13, reference 38): a
 * half-ring of 24 radial ticks coloured by stage, the total in the middle
 * with its label under it, then a legend list: a dot, the stage name
 * 13/500, one muted sub-line, and the share on the right, tabular.
 *
 * STAGES ARE THE RECORD'S REAL STATUSES (reservations by status, listings by
 * status, the admin queue by stage), in the order a record moves through
 * them. Ticks are shared out in proportion to each stage's count by the
 * largest remainder, so they always add up to 24 and a stage with any
 * records gets at least one tick while there are ticks to give. With no
 * records at all the caller leaves the card out (spec section 13.1); drawn
 * anyway, every tick is the unlit track and the total reads 0.
 *
 * MOTION (plan item 26): the ticks light in order, 12ms apart, about 480ms
 * in all (`.nf-gauge--light` in `app/css/controls.css`); under reduced
 * motion, Calm and Off they are simply lit.
 *
 * Server-safe: pure SVG.
 */
export type GaugeStage = {
  key: string;
  label: string;
  count: number;
  tone: ChartTone;
  /** One muted line under the name ("12 requests, oldest 3 h ago"). */
  sub?: ReactNode;
};

const TICKS = 24;

/** Share TICKS out across the stages by the largest remainder. */
export function allotTicks(counts: number[], ticks = TICKS): number[] {
  const total = counts.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return counts.map(() => 0);
  const exact = counts.map((c) => (Math.max(0, c) / total) * ticks);
  const out = exact.map((x) => Math.floor(x));
  /* Any stage with records and no tick takes one first, while ticks last. */
  let left = ticks - out.reduce((a, b) => a + b, 0);
  counts.forEach((c, i) => {
    if (left > 0 && c > 0 && out[i] === 0) {
      out[i] = 1;
      left -= 1;
    }
  });
  const order = exact
    .map((x, i) => ({ i, r: x - Math.floor(x) }))
    .sort((a, b) => b.r - a.r)
    .map((o) => o.i);
  for (let k = 0; left > 0 && k < order.length * 2; k++) {
    const i = order[k % order.length]!;
    if (counts[i]! > 0) {
      out[i]! += 1;
      left -= 1;
    }
  }
  /* The forced minimums can overshoot; take the excess from the largest. */
  while (out.reduce((a, b) => a + b, 0) > ticks) {
    const max = out.indexOf(Math.max(...out));
    out[max]! -= 1;
  }
  return out;
}

export function Gauge({
  stages,
  totalLabel,
  label,
  tag = "en-NG",
  legend = true,
  className,
}: {
  stages: GaugeStage[];
  /** The word under the total ("reservations"). */
  totalLabel: ReactNode;
  /** Names the whole gauge for a screen reader. */
  label: string;
  tag?: string;
  legend?: boolean;
  className?: string;
}) {
  const total = stages.reduce((a, s) => a + Math.max(0, s.count), 0);
  const allotted = allotTicks(stages.map((s) => s.count));
  const fills: string[] = [];
  stages.forEach((s, i) => {
    for (let k = 0; k < allotted[i]!; k++) fills.push(TONE_FILL[s.tone]);
  });
  while (fills.length < TICKS) fills.push(TRACK_FILL);

  const cx = 100;
  const cy = 100;
  const r = 84;
  const fmt = new Intl.NumberFormat(tag);

  return (
    <figure className={["nf-gauge", "nf-gauge--light", className ?? ""].filter(Boolean).join(" ")}>
      <div className="nf-gauge__dial">
        <svg
          viewBox="0 0 200 108"
          role="img"
          aria-label={`${label}: ${stages.map((s) => `${s.label} ${s.count}`).join(", ")}, ${total} in total.`}
          className="nf-gauge__svg"
        >
          {fills.map((f, i) => {
            const angle = 180 - (i * 180) / (TICKS - 1);
            const rad = (angle * Math.PI) / 180;
            const x = cx + r * Math.cos(rad);
            const y = cy - r * Math.sin(rad);
            return (
              <rect
                key={i}
                x={-1.5}
                y={-7}
                width={3}
                height={14}
                rx={1.5}
                className="nf-gauge__tick"
                style={{ fill: f, animationDelay: `${i * 12}ms` }}
                transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(90 - angle).toFixed(2)})`}
              />
            );
          })}
        </svg>
        <div className="nf-gauge__centre">
          <span className="nf-gauge__total nf-numeric">{fmt.format(total)}</span>
          <span className="nf-gauge__total-label">{totalLabel}</span>
        </div>
      </div>
      {legend ? (
        <ul className="nf-gauge__legend">
          {stages.map((s) => (
            <li key={s.key} className="nf-gauge__row">
              <span aria-hidden="true" className="nf-gauge__dot" style={{ background: TONE_FILL[s.tone] }} />
              <span className="nf-gauge__text">
                <span className="nf-gauge__name">{s.label}</span>
                {s.sub != null ? <span className="nf-gauge__sub">{s.sub}</span> : null}
              </span>
              <span className="nf-gauge__share nf-numeric">
                {total > 0 ? `${Math.round((Math.max(0, s.count) / total) * 100)}%` : fmt.format(0)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
