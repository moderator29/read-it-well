import { clamp } from "@/components/ui/ported-motion";

/*
 * The deck's arithmetic for Get Started (`WelcomeIntro.tsx`), kept pure so it
 * is tested without a browser (`deck.test.ts`).
 */

/**
 * How the layers of card `i` sit when the deck is at `p` (pure, for the
 * tests), as the custom properties get-started.css reads. Distances are in
 * cards (`--gs-d`), and the sheet turns them into the stage's own width with
 * container units, so the server can draw the first frame exactly (no width
 * to measure) and a resize needs nothing from script.
 */
export function cardPose(i: number, p: number): Record<string, string> {
  const d = i - p;
  const near = Math.min(Math.abs(d), 1);
  return {
    "--gs-d": d.toFixed(4),
    "--gs-type-o": (1 - near * 0.7).toFixed(3),
    "--gs-scene-o": (1 - near).toFixed(3),
    "--gs-scene-s": (1 + near * 0.06).toFixed(4),
    "--gs-obj-o": clamp(1 - near * 1.3, 0, 1).toFixed(3),
    visibility: Math.abs(d) >= 1.5 ? "hidden" : "visible",
  };
}

/**
 * Where a release lands (pure, for the tests): one card on from where the
 * drag began when the finger carried the deck a quarter of the way or threw
 * it, back where it began otherwise; never more than one card, never past
 * either end. `velocityPerSecond` is the finger's, in pixels (positive is to
 * the right, which is back).
 */
export function settleTarget(start: number, p: number, velocityPerSecond: number, count: number) {
  const from = Math.round(start);
  const moved = p - from;
  const thrown = Math.abs(velocityPerSecond) > 380 ? -Math.sign(velocityPerSecond) : 0;
  const step = thrown !== 0 ? thrown : Math.abs(moved) >= 0.25 ? Math.sign(moved) : 0;
  return clamp(from + step, 0, count - 1);
}
