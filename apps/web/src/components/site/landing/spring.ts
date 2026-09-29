/**
 * A SMALL SPRING FOR THINGS YOU CAN MOVE BY HAND (the landing's demo stack,
 * 29 September 2026). No dependency: a damped spring integrated per frame,
 * the rubber band a drag feels past its limit, and a pointer helper that
 * moves an element with `transform` only and springs it home on release.
 *
 * Pure maths first (`stepSpring`, `rubber`, `releaseVelocity`), so it is
 * tested in Node; the one function that touches the DOM (`springTo`) only
 * drives `requestAnimationFrame` and hands each frame to a callback.
 */

export type SpringConfig = {
  /** How hard it pulls home (per unit mass). */
  stiffness: number;
  /** How quickly it loses energy. Critical damping is 2 * sqrt(stiffness). */
  damping: number;
};

/** A quick, barely-overshooting spring: settles in about 450ms. */
export const SPRING_SNAPPY: SpringConfig = { stiffness: 420, damping: 34 };
/** A softer one with a small, visible bounce, for a flicked card. */
export const SPRING_SOFT: SpringConfig = { stiffness: 260, damping: 22 };

/**
 * One step of a damped spring toward `target`, semi-implicit Euler (stable
 * at 60 to 120 frames a second). Positions in px, velocity in px/s, `dt`
 * in seconds; returns the next position and velocity.
 */
export function stepSpring(
  position: number,
  velocity: number,
  target: number,
  dt: number,
  { stiffness, damping }: SpringConfig,
): [number, number] {
  const force = -stiffness * (position - target) - damping * velocity;
  const v = velocity + force * dt;
  return [position + v * dt, v];
}

/** At rest: within half a pixel of home and moving under 20 px/s. */
export function isSettled(position: number, velocity: number, target: number): boolean {
  return Math.abs(position - target) < 0.5 && Math.abs(velocity) < 20;
}

/**
 * The rubber band past a limit: free travel up to nothing, then ever
 * stiffer, approaching `limit` and never passing it. The iOS curve,
 * `(1 - 1 / (x * c / d + 1)) * d`, signed.
 */
export function rubber(offset: number, limit: number, c = 0.55): number {
  if (limit <= 0) return 0;
  const sign = Math.sign(offset);
  const x = Math.abs(offset);
  return sign * (1 - 1 / ((x * c) / limit + 1)) * limit;
}

/**
 * The release velocity in px/s from the last pointer samples, looking back
 * at most `windowMs` so a pause before letting go reads as a stop.
 */
export function releaseVelocity(
  samples: ReadonlyArray<{ t: number; x: number; y: number }>,
  windowMs = 90,
): { vx: number; vy: number } {
  const last = samples[samples.length - 1];
  if (!last || samples.length < 2) return { vx: 0, vy: 0 };
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    const s = samples[i];
    if (!s || last.t - s.t > windowMs) break;
    first = s;
  }
  const dt = (last.t - first.t) / 1000;
  if (dt <= 0) return { vx: 0, vy: 0 };
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

/**
 * Whether a horizontal release is a flick to the next or previous card:
 * past a distance, or fast enough, and more sideways than up or down.
 * Returns +1 (to the next, a leftward throw), -1, or 0.
 */
export function flickDirection(dx: number, dy: number, vx: number, distance = 80, speed = 550): -1 | 0 | 1 {
  if (Math.abs(dx) < Math.abs(dy) * 0.9) return 0;
  if (dx <= -distance || vx <= -speed) return 1;
  if (dx >= distance || vx >= speed) return -1;
  return 0;
}

/**
 * Run a 2D spring from `from` to `to` on animation frames, handing each
 * frame's position to `onFrame`. Returns a cancel function. Frames are
 * capped at 1/30s so a dropped frame never teleports the element.
 */
export function springTo(
  from: { x: number; y: number },
  to: { x: number; y: number },
  velocity: { vx: number; vy: number },
  onFrame: (x: number, y: number) => void,
  onDone?: () => void,
  config: SpringConfig = SPRING_SNAPPY,
): () => void {
  let x = from.x;
  let y = from.y;
  let vx = velocity.vx;
  let vy = velocity.vy;
  let prev = 0;
  let raf = 0;
  const tick = (now: number) => {
    const dt = prev ? Math.min((now - prev) / 1000, 1 / 30) : 1 / 60;
    prev = now;
    [x, vx] = stepSpring(x, vx, to.x, dt, config);
    [y, vy] = stepSpring(y, vy, to.y, dt, config);
    if (isSettled(x, vx, to.x) && isSettled(y, vy, to.y)) {
      onFrame(to.x, to.y);
      onDone?.();
      return;
    }
    onFrame(x, y);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
