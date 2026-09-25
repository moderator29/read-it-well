/**
 * WHETHER SOMETHING MAY MOVE (Track M, 25 September 2026).
 *
 * One answer for every client component that animates in script rather than
 * in CSS, so they cannot disagree with the stylesheets:
 *
 *   quiet      the operating system asks for less motion, or the motion
 *              setting is Calm or Off. Draw the final state and stop.
 *   ambient    a background that moves on its own (the Truchet field, the
 *              drifting columns). Needs not-quiet, the Living backgrounds
 *              switch on, and data saving off.
 *
 * Client only; both read the live root, so a change in Settings applies to
 * the next check without a reload.
 */
export function motionQuiet(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  } catch {
    return true;
  }
  const level = document.documentElement.dataset.motion;
  return level === "calm" || level === "off";
}

export function ambientAllowed(): boolean {
  if (motionQuiet()) return false;
  const root = document.documentElement;
  return root.dataset.motionAmbient !== "off" && root.dataset.saveData !== "on";
}

/** Cinematic asks for more of everything. */
export function motionCinematic(): boolean {
  return !motionQuiet() && document.documentElement.dataset.motion === "cinematic";
}
