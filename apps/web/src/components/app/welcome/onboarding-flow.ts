/**
 * GET STARTED IN MOTION (30 September): the rules behind the moving first run,
 * as pure functions so they are tested without a browser
 * (`onboarding-flow.test.ts`). `FirstRun.tsx` draws them.
 *
 * The founder's references are 51 to 53 in docs/design/references/2026-09-29
 * (a fintech onboarding video): a back chevron and Skip across the top, a
 * segmented progress bar, an animated scene per step, the title and body
 * arriving after it, and one pill Continue at the bottom. Moving between
 * steps is a horizontal slide with a crossfade.
 */

/** Where a step sits against the one on screen. */
export type SceneState = "prev" | "active" | "next";

export function sceneState(i: number, index: number): SceneState {
  if (i === index) return "active";
  return i < index ? "prev" : "next";
}

/** The step a move lands on, kept inside the flow. */
export function clampStep(to: number, last: number): number {
  if (!Number.isFinite(to)) return 0;
  return Math.max(0, Math.min(last, Math.round(to)));
}

/**
 * A key press on desktop: the arrows move one step, Home and End jump to
 * either end. Anything else is not ours (null), so typing in a field and the
 * browser's own keys are left alone.
 */
export function keyStep(key: string, index: number, last: number): number | null {
  switch (key) {
    case "ArrowRight":
      return clampStep(index + 1, last);
    case "ArrowLeft":
      return clampStep(index - 1, last);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

/* How far the finger must travel (share of the width) or how fast (px/s)
   before a release turns the step. */
export const SWIPE_SHARE = 0.18;
export const SWIPE_SPEED = 450;

/**
 * A released swipe: which step it lands on. A mostly vertical move, a short
 * slow one, or one past either end stays put. Swiping right to left (a
 * negative `dx`) moves on, as a page turns.
 */
export function swipeStep({
  dx,
  dy,
  vx,
  width,
  index,
  last,
}: {
  dx: number;
  dy: number;
  /** The finger's speed along x at release, px/s. */
  vx: number;
  width: number;
  index: number;
  last: number;
}): number {
  if (Math.abs(dy) > Math.abs(dx)) return index;
  const far = Math.abs(dx) >= Math.max(1, width) * SWIPE_SHARE;
  const fast = Math.abs(vx) >= SWIPE_SPEED && Math.sign(vx) === Math.sign(dx);
  if (!far && !fast) return index;
  return clampStep(index + (dx < 0 ? 1 : -1), last);
}

/**
 * How much of each progress segment is filled: every step reached so far is
 * full, the ones ahead are empty. One segment per step.
 */
export function progressFills(index: number, total: number): number[] {
  return Array.from({ length: Math.max(0, total) }, (_, i) => (i <= index ? 1 : 0));
}

/**
 * WHAT SKIP DOES, exactly as it did before the motion pass:
 *
 *   a stranger going somewhere    records the device and carries on there
 *   a stranger going nowhere      records the device and lands on the ending
 *                                 (the account choice)
 *   somebody signed in            the real skip on the server (the opener
 *                                 marked seen and the interests question
 *                                 skipped), then their destination or home
 */
export type SkipPlan =
  | { kind: "go"; to: string }
  | { kind: "ending" }
  | { kind: "member"; to: string };

export function skipPlan({ guest, next }: { guest: boolean; next: string | null }): SkipPlan {
  if (guest) return next ? { kind: "go", to: next } : { kind: "ending" };
  return { kind: "member", to: next ?? "/home" };
}

/**
 * THE MOTION, per the reader's setting. `quiet` is reduced motion, or the
 * in-app Motion setting at Calm or Off (`useMotionGate`); `ambient` is
 * whether something may keep moving on its own (not quiet, living
 * backgrounds on, data saver off).
 *
 *   slide     the step change slides and crossfades; quiet, it lands at once
 *   stagger   the scene's pieces arrive one after another, then the words
 *   follow    a drag moves the scene with the finger
 *   idle      the gentle float once a scene has arrived
 *   count     the hero figure counts up
 */
export type MotionPlan = {
  slide: boolean;
  stagger: boolean;
  follow: boolean;
  idle: boolean;
  count: boolean;
};

export function motionPlan({ quiet, ambient }: { quiet: boolean; ambient: boolean }): MotionPlan {
  if (quiet) return { slide: false, stagger: false, follow: false, idle: false, count: false };
  return { slide: true, stagger: true, follow: true, idle: ambient, count: true };
}

/**
 * Where each scene is drawn while a finger drags, from the drag's share of
 * the width (`f`, negative when moving on). Offsets are in steps: the scene
 * on screen is 0, the next 1 and the previous -1. The scene coming in fades
 * up as the one leaving fades down, so two half-faded scenes never sit on
 * top of each other at full strength.
 */
export function dragPose(offset: number, f: number): { shift: number; opacity: number } {
  const clampedF = Math.max(-1, Math.min(1, f));
  const at = offset + clampedF;
  const opacity = Math.max(0, 1 - Math.abs(at));
  return { shift: Number(at.toFixed(4)), opacity: Number(opacity.toFixed(4)) };
}
