import { useId } from "react";
import {
  MARK_ABOVE_RING,
  MARK_GRADIENTS,
  MARK_RING,
  MARK_RING_CENTRE,
  MARK_SIDE,
  MARK_TOWERS,
  MARK_VIEWBOX,
} from "@/lib/brand/logo-geometry";

/**
 * THE MARK, DRAWN INLINE SO IT CAN MOVE (D81, 8 October 2026: "Let's make
 * this cinematic").
 *
 * The same drawing as `public/brand/vallo-mark.svg` (both come from
 * `scripts/brand/logo-art.mjs`), in parts:
 *
 *   reveal   the towers rise out of the ring one after another, tallest
 *            last, and the ring draws itself from the cyan tip at the back
 *            left, round the front, to its orange end. About a second.
 *   orbit    the loading mark: the towers stand, and a short light runs
 *            round the ring, blue into orange, again and again.
 *   still    the drawing, nothing moving.
 *
 * The motion is CSS (`app/css/logo-motion.css`, `.nf-vmark`), on the app's
 * own durations and eases, and it stops under reduced motion, data saving
 * and the Calm and Off motion settings: the mark is then simply drawn.
 *
 * Both palettes are in the drawing; `app/css/light.css` shows the day one on
 * paper and the night one on navy, exactly as for `LogoMark`.
 *
 * Server-safe: markup only. `useId` keeps two marks on one page from sharing
 * gradient ids.
 */
export function LogoMarkLive({
  size = 56,
  motion = "reveal",
  title,
  className,
}: {
  size?: number;
  motion?: "reveal" | "orbit" | "still";
  /** The accessible name. Without one the mark is decoration. */
  title?: string;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const vb = MARK_VIEWBOX;
  const height = Math.round((size * vb.h) / vb.w);
  const id = (theme: string, name: string) => `${uid}-${theme}-${name}`;

  const art = (theme: "night" | "day") => (
    <g className={`nf-logo-art nf-logo-art--${theme}`}>
      <defs>
        {MARK_GRADIENTS[theme].map((g) => (
          <linearGradient
            key={g.id}
            id={id(theme, g.id)}
            x1={g.x1}
            y1={g.y1}
            x2={g.x2}
            y2={g.y2}
            gradientUnits={g.user ? "userSpaceOnUse" : undefined}
          >
            {g.stops.map((stop) => (
              <stop
                key={stop[0]}
                offset={stop[0]}
                stopColor={stop[1]}
                stopOpacity={stop.length > 2 ? (stop as readonly [number, string, number])[2] : undefined}
              />
            ))}
          </linearGradient>
        ))}
        <clipPath id={id(theme, "above")}>
          <path d={MARK_ABOVE_RING} />
        </clipPath>
        <mask id={id(theme, "sweep")} style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x={vb.x} y={vb.y} width={vb.w} height={vb.h}>
          <path className="nf-vmark__sweep" d={MARK_RING_CENTRE} pathLength={1} />
        </mask>
      </defs>
      <g className="nf-vmark__ring-wrap" mask={motion === "reveal" ? `url(#${id(theme, "sweep")})` : undefined}>
        <path className="nf-vmark__ring" d={MARK_RING} fill={`url(#${id(theme, "ring")})`} />
      </g>
      <g clipPath={`url(#${id(theme, "above")})`}>
        {MARK_TOWERS.map((t, i) => (
          <g key={t.id} className="nf-vmark__tower" style={{ "--nf-i": TOWER_ORDER[i] } as React.CSSProperties}>
            <path d={t.d} fill={`url(#${id(theme, t.tone === "orange" ? "orange" : "blue")})`} />
            {t.side ? <path d={t.side} fill={MARK_SIDE[theme]} opacity={0.55} /> : null}
            <path d={t.d} fill={`url(#${id(theme, "sheen")})`} />
          </g>
        ))}
      </g>
      <path d={MARK_RING} fill={`url(#${id(theme, "ringShade")})`} />
      {motion === "orbit" ? (
        <path className="nf-vmark__orbit" d={MARK_RING_CENTRE} pathLength={1} />
      ) : null}
    </g>
  );

  return (
    <svg
      className={`nf-vmark nf-vmark--${motion} ${className ?? ""}`}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      width={size}
      height={height}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {art("night")}
      {art("day")}
    </svg>
  );
}

/** The order the towers rise in: the small ones first, the tall blue one last. */
const TOWER_ORDER = [1, 3, 2, 0] as const;
