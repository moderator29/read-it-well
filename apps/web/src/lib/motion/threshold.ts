/**
 * THRESHOLD MOMENTS (Track M, 25 September 2026).
 *
 * The founder asked that crossing into Vallo should feel like passing through
 * a door: after verifying a new account, when coming back to the app, and on
 * the way out. `ThresholdStage`, mounted once in the root layout, draws them;
 * this is how any part of the app asks for one.
 *
 * `playThreshold` resolves when the "going" half has played, so the caller
 * navigates at the moment the door is fully open. The "arriving" half plays
 * on the next route by itself. Under reduced motion, or with data saving on,
 * it resolves at once and nothing is drawn: a threshold is never allowed to
 * delay somebody who asked for less.
 *
 * Client only.
 */
export type ThresholdKind = "door" | "leave";

export const THRESHOLD_EVENT = "nf:threshold";

/** How long the "going" half takes before the caller may navigate. */
export const THRESHOLD_GOING_MS: Record<ThresholdKind, number> = {
  door: 1500,
  leave: 650,
};

export function thresholdAllowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  } catch {
    return false;
  }
  return document.documentElement.dataset.saveData !== "on";
}

export function playThreshold(kind: ThresholdKind): Promise<void> {
  if (!thresholdAllowed()) return Promise.resolve();
  window.dispatchEvent(new CustomEvent(THRESHOLD_EVENT, { detail: kind }));
  return new Promise((resolve) => window.setTimeout(resolve, THRESHOLD_GOING_MS[kind]));
}
