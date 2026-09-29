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
 * Where each plate lands, relative to the centre of the plus.
 *
 * MEASURED, NOT DRAWN BY EYE, off the founder's
 * `docs/design/references/founder/feed-plus-bloom-target.jpg` (the same pixels
 * as `GOVERNING-feed-plus-bloom.png`). The phone's screen runs from x 178 to
 * x 843 in that 1024 x 1536 image, 665 image px for a 390 CSS px viewport, so
 * one image px is 0.5865 CSS px. Each plate was counter-rotated until its
 * edges ran level, which gives its tilt, and its centre was mapped back into
 * the image and then to CSS px from the plus's centre (791.4, 1298.8):
 *
 *   plate    centre (image)   from the plus (CSS)   tilt    size (CSS)
 *   Review   790.3, 1213.5    -0.7, -50.0           -13     90 x 37
 *   Story    739.6, 1155.5    -30.4, -84.0          -17     93 x 37
 *   Post     683.1, 1103.0    -63.5, -114.8         -20     89 x 37
 *
 * Nearest the thumb is least tilted and the tilt grows outward, so the three
 * lie along one arc that leans further the further it is thrown.
 *
 * Tilts, sizes (91 x 37), the spacing along the arc and the plus's place (its
 * centre 30 CSS px in from the screen's edge) are the image's. The plates are
 * rounded rectangles on the control radius rather than capsules, the
 * founder's own ruling. Each plate's tap target is 44 tall by a
 * pseudo-element, which paints nothing.
 *
 * THE ONE PLACE THE IMAGE CANNOT BE COPIED. The image draws Review over the
 * phone's frame: its centre sits 0.7px left of the plus's, and the plus's
 * centre is 30px from the edge, but a 91px plate tilted 13 degrees is 97px
 * wide. On a real screen that put Review's right end 18px off the glass and
 * cut the last letters of its label, and its foot ran under the plus, which
 * paints above the fan. So the whole fan moves left by `BLOOM_FAN_SHIFT_X`,
 * derived below from that constraint rather than chosen by eye: the smallest
 * uniform shift that leaves every plate's rotated box `BLOOM_EDGE_GUTTER`
 * clear of the screen's edge. Uniform, so the arc, the spacing and the tilts
 * are unchanged; the geometry test holds both.
 *
 * Index 0 is the plate nearest the plus. It opens first and closes last, so
 * the fan grows outward and folds inward, and it paints on top, as the render
 * lays Review over Story and Story over Post.
 */
export type BloomSlot = { x: number; y: number; rotate: number };

/** The measured centres and tilts, before the shift. */
export const BLOOM_MEASURED: readonly BloomSlot[] = [
  { x: -0.7, y: -50.0, rotate: -13 },
  { x: -30.4, y: -84.0, rotate: -17 },
  { x: -63.5, y: -114.8, rotate: -20 },
];

/** A plate's width and height, as the stylesheet draws them. */
export const BLOOM_ITEM = { width: 91, height: 37 } as const;

/** The plus: 58px across (98 image px), its centre 30px in from the edge. */
export const BLOOM_PLUS = { size: 58, inset: 1 } as const;

/** Air kept between any plate's rotated box and the screen's edge. It also
    covers the plate's 1px outer ring. */
export const BLOOM_EDGE_GUTTER = 8;

/** Half the width of a plate's axis-aligned box once it is tilted. */
export function bloomHalfExtentX(rotate: number): number {
  const rad = (Math.abs(rotate) * Math.PI) / 180;
  return (BLOOM_ITEM.width / 2) * Math.cos(rad) + (BLOOM_ITEM.height / 2) * Math.sin(rad);
}

/**
 * The uniform leftward move that keeps every plate on the screen: for each
 * plate, how far its right side may sit from the plus's centre, less where
 * the image put it, and the tightest of the three wins. Rounded down to a
 * whole pixel so it only ever errs further on to the screen.
 */
export const BLOOM_FAN_SHIFT_X = Math.min(
  0,
  ...BLOOM_MEASURED.map((slot) =>
    Math.floor(
      BLOOM_PLUS.inset + BLOOM_PLUS.size / 2 - BLOOM_EDGE_GUTTER - bloomHalfExtentX(slot.rotate) - slot.x,
    ),
  ),
);

const SLOTS: BloomSlot[] = BLOOM_MEASURED.map((slot) => ({
  x: Math.round((slot.x + BLOOM_FAN_SHIFT_X) * 10) / 10,
  y: slot.y,
  rotate: slot.rotate,
}));

export function bloomSlot(index: number): BloomSlot {
  return SLOTS[Math.min(index, SLOTS.length - 1)] ?? SLOTS[0]!;
}

/**
 * The trail the render draws behind each plate: a glowing curve from the
 * plate's trailing (lower left) end sweeping down into the left of the plus,
 * so the three read as thrown out of it. Returned as an SVG path in the plus's
 * own coordinates (origin at its centre).
 */
export function bloomTrail(slot: BloomSlot): string {
  const rad = (slot.rotate * Math.PI) / 180;
  /* The plate's lower left, just inside its rounded end: the local point
     (-half, down) turned by the plate's tilt. */
  const half = BLOOM_ITEM.width / 2 - 10;
  const down = BLOOM_ITEM.height / 2 - 6;
  const sx = slot.x - half * Math.cos(rad) - down * Math.sin(rad);
  const sy = slot.y - half * Math.sin(rad) + down * Math.cos(rad);
  /* Into the plus's left shoulder. */
  const ex = -BLOOM_PLUS.size / 2 + 4;
  const ey = 6;
  /* The bulge sits out to the left and low, which is the render's curve. */
  const cx = Math.min(sx, ex) - 6;
  const cy = ey - 4;
  return `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
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
