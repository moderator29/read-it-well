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
export type ThresholdKind = "door" | "leave" | "open";

export const THRESHOLD_EVENT = "nf:threshold";

/** How long the "going" half takes before the caller may navigate. */
export const THRESHOLD_GOING_MS: Record<ThresholdKind, number> = {
  door: 1500,
  leave: 650,
  open: 1500,
};

/**
 * THE `open` KIND: THE APP OPENING (Session 3).
 *
 * MOTION_SYSTEM.md section 3 specifies a 1,500ms cold-start sequence and says
 * this file "gains an `open` kind beside `door` and `leave`". The sequence is
 * built (`components/startup`, after Session 2 bounded `app/open/route.ts`)
 * and it is CSS keyed on the root flag, so it never dispatches this kind: it
 * starts on the first painted frame, before any script could ask. The kind is
 * for a caller that wants the same door later (the passcode unlock), and the
 * stage draws nothing for it: the arrival is threshold.css's
 * `:root[data-arrive="open"]` hook.
 *
 * The beats are written here as data rather than only as keyframe delays, so
 * the sequence the spec describes and the sequence that ships can be compared
 * by a test instead of by eye. Each beat is [start, end] in milliseconds from
 * the first frame, with the designer's curve name.
 */
export const OPEN_BEATS = [
  { beat: "ground", from: 0, to: 120, curve: "none" },
  { beat: "mark", from: 120, to: 480, curve: "land" },
  { beat: "wordmark", from: 380, to: 720, curve: "glide" },
  { beat: "edge-light", from: 640, to: 900, curve: "glide" },
  { beat: "breath", from: 900, to: 1150, curve: "drift" },
  { beat: "door", from: 1150, to: 1500, curve: "leave" },
] as const;

export function thresholdAllowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  } catch {
    return false;
  }
  const root = document.documentElement;
  /* The motion setting: Calm and Off have no thresholds, and the doors can be
     switched off on their own. */
  if (root.dataset.motion === "calm" || root.dataset.motion === "off") return false;
  if (root.dataset.motionDoors === "off") return false;
  return root.dataset.saveData !== "on";
}

export function playThreshold(kind: ThresholdKind): Promise<void> {
  if (!thresholdAllowed()) return Promise.resolve();
  window.dispatchEvent(new CustomEvent(THRESHOLD_EVENT, { detail: kind }));
  return new Promise((resolve) => window.setTimeout(resolve, THRESHOLD_GOING_MS[kind]));
}
