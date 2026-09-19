/**
 * The bloom's physics, kept pure so a test can run it without a browser.
 *
 * A damped spring rather than an easing curve, because the governing image
 * draws three lozenges that have been THROWN out of the plus and caught, and a
 * bezier cannot overshoot on its own axis. `stepSpring` integrates one degree of
 * freedom (a progress value from 0 to 1) with semi-implicit Euler at a fixed
 * substep, so the result is the same at 30fps and at 120fps: the frame loop
 * hands in real elapsed time and this slices it.
 *
 * The numbers are the only tuning in the feature. Stiffness 450 and damping 26
 * on unit mass give one clear overshoot of about eight per cent and a settle
 * inside 450ms, which reads as a spring without reading as jelly.
 */

export type SpringState = { value: number; velocity: number };

export type SpringConfig = { stiffness: number; damping: number; mass: number };

export const BLOOM_SPRING: SpringConfig = { stiffness: 450, damping: 26, mass: 1 };

/** Below these the spring is called settled and the loop stops. */
const REST_DELTA = 0.004;
const REST_SPEED = 0.04;
/** Fixed integration step, in seconds. */
const SUBSTEP = 1 / 240;

export function stepSpring(
  state: SpringState,
  target: number,
  elapsedMs: number,
  config: SpringConfig = BLOOM_SPRING,
): SpringState {
  let { value, velocity } = state;
  /* A tab left in the background hands back a huge elapsed time on its first
     frame. Capping it keeps the integrator stable and lands the spring near
     rest rather than flinging it. */
  let remaining = Math.min(elapsedMs, 64) / 1000;
  while (remaining > 0) {
    const dt = Math.min(SUBSTEP, remaining);
    const force = -config.stiffness * (value - target) - config.damping * velocity;
    velocity += (force / config.mass) * dt;
    value += velocity * dt;
    remaining -= dt;
  }
  return { value, velocity };
}

export function isSettled(state: SpringState, target: number): boolean {
  return Math.abs(state.value - target) < REST_DELTA && Math.abs(state.velocity) < REST_SPEED;
}

/* ---------------------------------------------------------------- geometry */

/**
 * Where each lozenge lands, relative to the centre of the plus.
 *
 * Measured off `GOVERNING-feed-plus-bloom.png` and scaled to a real 390px
 * viewport: Review sits just above the plus and a little to its left, Story
 * further up and left, Post furthest, the three on one arc that curves up and
 * away from the thumb, each tilted a little more than the one before so the
 * fan reads as thrown rather than stacked. The render lets Review poke past
 * the phone's edge; a real viewport cannot paint there, so every slot keeps
 * the lozenge inside the screen.
 *
 * Index 0 is the lozenge nearest the plus. It opens first and closes last, so
 * the fan grows outward and folds inward.
 */
export type BloomSlot = { x: number; y: number; rotate: number };

const SLOTS: BloomSlot[] = [
  { x: -24, y: -66, rotate: -8 },
  { x: -64, y: -120, rotate: -14 },
  { x: -106, y: -174, rotate: -20 },
];

/** A lozenge's width and height, as the stylesheet draws them. */
export const BLOOM_ITEM = { width: 124, height: 46 } as const;

export function bloomSlot(index: number): BloomSlot {
  return SLOTS[Math.min(index, SLOTS.length - 1)] ?? SLOTS[0]!;
}

/** How long each lozenge waits after the one before it, in milliseconds. */
export const BLOOM_STAGGER_MS = 55;

/**
 * One lozenge's transform at a given progress. Progress below zero and above
 * one are both allowed and both meaningful: the spring overshoots past its
 * slot and springs back, and on the way closed it dips under the plus.
 */
export function bloomTransform(slot: BloomSlot, progress: number): string {
  const x = slot.x * progress;
  const y = slot.y * progress;
  const scale = 0.4 + 0.6 * Math.max(0, Math.min(1.08, progress));
  const rotate = slot.rotate * progress;
  return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rotate.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
}
