/**
 * THE CURVES, FOR MOTION THAT RUNS IN SCRIPT (Session 3, 6 October 2026).
 *
 * The stylesheets read the ease tokens in tokens.css; a figure counting up
 * frame by frame in `requestAnimationFrame` cannot read a CSS variable, so it
 * used to approximate with `1 - (1 - p) ** 3`, a curve with no name that no
 * stylesheet uses. These are the same five cubic-beziers as the tokens, by the
 * motion designer's names (MOTION_SYSTEM.md section 0), so a figure and the
 * card it sits on move on one curve.
 *
 *   land   --nf-ease-entrance   snap in
 *   leave  --nf-ease-exit       ease out
 *   glide  --nf-ease-standard   smooth float
 *   drift  --nf-ease-spring     slow settle
 *   whip   --nf-ease-whip       fast flick
 *
 * Pure and deterministic, so a test can hold the curve to its endpoints.
 */
export type Ease = (progress: number) => number;

/**
 * The CSS `cubic-bezier()` timing function as a function of progress.
 *
 * x(t) is solved for t by Newton's method with a bisection fallback, which is
 * the same approach the browser takes; 1e-6 is far below a pixel on any
 * figure this drives.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-6) return t;
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (sampleX(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (progress: number) => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    return sampleY(solve(progress));
  };
}

export const EASE = {
  land: cubicBezier(0.16, 1, 0.3, 1),
  leave: cubicBezier(0.4, 0, 1, 1),
  glide: cubicBezier(0.22, 0.61, 0.36, 1),
  drift: cubicBezier(0.34, 1.28, 0.64, 1),
  whip: cubicBezier(0.7, 0, 0.2, 1),
} as const;

/** Figure arrival: counts from zero once per mount (motion 4). */
export const FIGURE_ARRIVAL_MS = 620;
/** Figure change: each changed digit rolls (motion 5). */
export const ODOMETER_MS = 380;
/** ... staggered left to right. */
export const ODOMETER_STAGGER_MS = 20;
