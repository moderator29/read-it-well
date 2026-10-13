/**
 * THE ARITHMETIC OF THE MEDIA VIEWER'S GESTURES, pure so it is tested without a
 * browser (`media-gesture.test.ts`); `MediaViewer` only feeds it pointer
 * positions and applies what it answers.
 *
 * The photograph sits centred in the stage and is transformed about its
 * centre: `translate(x, y) scale(s)`. A point `p` (measured from the stage's
 * centre, in the photograph's own unscaled space) is therefore on screen at
 * `t + s * p`.
 */
export type Zoom = { scale: number; x: number; y: number };
export const REST: Zoom = { scale: 1, x: 0, y: 0 };

export const MIN_SCALE = 1;
export const MAX_SCALE = 5;
/** Where a double tap zooms to. */
export const DOUBLE_TAP_SCALE = 2.5;

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

export const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** The size a photograph is drawn at when it is fitted ("contain") into the stage. */
export function fitted(stage: Size, natural: Size | null): Size {
  if (!natural || natural.width <= 0 || natural.height <= 0 || stage.width <= 0 || stage.height <= 0) return stage;
  const ratio = natural.width / natural.height;
  return ratio > stage.width / stage.height
    ? { width: stage.width, height: stage.width / ratio }
    : { width: stage.height * ratio, height: stage.height };
}

/** How far the photograph may be dragged each way at a scale: never past its own edges. */
export function panLimit(stage: Size, natural: Size | null, scale: number): Point {
  const shown = fitted(stage, natural);
  return {
    x: Math.max(0, (shown.width * scale - stage.width) / 2),
    y: Math.max(0, (shown.height * scale - stage.height) / 2),
  };
}

/** A zoom made legal: scale in range, and the pan inside the photograph's edges. */
export function legal(zoom: Zoom, stage: Size, natural: Size | null): Zoom {
  const scale = clamp(zoom.scale, MIN_SCALE, MAX_SCALE);
  if (scale <= MIN_SCALE) return REST;
  const limit = panLimit(stage, natural, scale);
  return { scale, x: clamp(zoom.x, -limit.x, limit.x), y: clamp(zoom.y, -limit.y, limit.y) };
}

/**
 * The zoom that keeps the photograph point that was under `from` (the start of
 * a pinch, or a tap) under `to` at a new scale. Pinching and panning with two
 * fingers are one move: `from` and `to` are the two fingers' midpoints,
 * measured from the stage's centre.
 */
export function zoomAbout(start: Zoom, scale: number, from: Point, to: Point): Zoom {
  const k = scale / start.scale;
  return { scale, x: to.x - k * (from.x - start.x), y: to.y - k * (from.y - start.y) };
}

/** What a double tap does: back to rest when zoomed, otherwise in about the tap. */
export function doubleTap(current: Zoom, at: Point, stage: Size, natural: Size | null): Zoom {
  if (current.scale > 1.05) return REST;
  return legal(zoomAbout(REST, DOUBLE_TAP_SCALE, at, { x: 0, y: 0 }), stage, natural);
}

export type Settle = "stay" | "previous" | "next";

/**
 * Where a sideways drag of `dx` pixels (taking `ms` milliseconds) settles: a
 * fifth of the width, or a quick flick, turns the page, if there is a page.
 */
export function settleSwipe(dx: number, ms: number, width: number, index: number, count: number): Settle {
  const velocity = Math.abs(dx) / Math.max(1, ms);
  const far = Math.abs(dx) > width * 0.2 || (Math.abs(dx) > 40 && velocity > 0.5);
  if (!far) return "stay";
  if (dx < 0 && index < count - 1) return "next";
  if (dx > 0 && index > 0) return "previous";
  return "stay";
}

/** Whether a downward drag closes the viewer: a fifth of the height, or a quick flick. */
export function settleDismiss(dy: number, ms: number, height: number): boolean {
  return dy > height * 0.2 || (dy > 60 && dy / Math.max(1, ms) > 0.6);
}

/** A drag that goes past the first or last photograph resists, a third of the way. */
export function resist(dx: number, index: number, count: number): number {
  return (dx > 0 && index === 0) || (dx < 0 && index === count - 1) ? dx / 3 : dx;
}

/** Which way a drag that has gone 8px is going: sideways, down to dismiss, or neither (up). */
export function lockDirection(dx: number, dy: number): "x" | "y" | null {
  if (Math.hypot(dx, dy) < 8) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return "x";
  return dy > 0 ? "y" : null;
}
