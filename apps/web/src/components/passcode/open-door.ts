import { thresholdAllowed } from "@/lib/motion/threshold";

/**
 * THE RIGHT CODE OPENS THE SAME DOOR THE APP OPENS WITH (MOTION_SYSTEM.md
 * section 6; directive D32: "unlocking and launching feel like one gesture").
 *
 * The going half is the lock's own: the last dot holds full for
 * `OPEN_HOLD_MS`, then the frame's contents leave on the `leave` curve over
 * `OPEN_LEAVE_MS` (`passcode.css`, `[data-door="open"]`) while the mark
 * stays, the way the startup's lockup holds its last frame. The arriving half
 * is the startup sequence's own: `:root[data-arrive="open"] #main` in
 * `app/css/threshold.css` (B1's `open` kind), which brings the page forward
 * through the door on the `leave` curve over 350ms, and a 160ms crossfade
 * under reduced motion.
 *
 * `ThresholdStage` cannot carry this one: it tells going from arriving by a
 * change of path, and an unlock does not change the path (the page is drawn
 * where the lock was). So the arrival is written here, once, when the lock
 * leaves the screen, and taken off again after the arrival has played. The
 * stage draws nothing for `open` and only clears the flag for a moment it
 * started itself, so the two never fight over it.
 */
export const OPEN_HOLD_MS = 80;
export const OPEN_LEAVE_MS = 240;
/** The arrival's 350ms (threshold.css) and a frame to spare. */
export const OPEN_ARRIVE_MS = 400;

export function arriveThroughOpenDoor(): void {
  if (typeof document === "undefined" || !thresholdAllowed()) return;
  const root = document.documentElement;
  if (root.dataset.arrive) return;
  root.dataset.arrive = "open";
  window.setTimeout(() => {
    if (root.dataset.arrive === "open") delete root.dataset.arrive;
  }, OPEN_ARRIVE_MS);
}
