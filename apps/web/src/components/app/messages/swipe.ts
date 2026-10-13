/**
 * SWIPE TO REPLY, THE ARITHMETIC (founder, 11 October 2026). Pure, so it is
 * tested rather than trusted.
 *
 * A received bubble is swiped to the right and a sent one to the left, the way
 * each points away from its own side of the thread. About 56px of finger
 * travel sets the reply target, the same as Reply in the message menu.
 *
 *   SLOP: nothing is decided until the finger has moved 8px. Then the larger
 *   axis wins for the rest of the gesture: a vertical start is the thread
 *   scrolling and is left to the browser, a horizontal start is the swipe.
 *   Either way the long press is cancelled, so a swipe never opens the menu.
 *
 *   TRAVEL: the bubble follows the finger 1:1 up to the threshold, then at a
 *   third of the speed, and never past 80px, so it cannot be dragged off the
 *   thread. Travel the wrong way draws nothing.
 */
export const SWIPE_REPLY_AT = 56;
export const SWIPE_SLOP = 8;
export const SWIPE_MAX = 80;

export type SwipeSide = "mine" | "theirs";
export type SwipeAxis = "x" | "y" | null;

/** The direction a bubble may travel: theirs to the right, mine to the left. */
export function swipeSign(side: SwipeSide): 1 | -1 {
  return side === "theirs" ? 1 : -1;
}

/** Null until the finger has moved past the slop; then the larger axis. */
export function lockAxis(dx: number, dy: number, slop = SWIPE_SLOP): SwipeAxis {
  if (Math.abs(dx) < slop && Math.abs(dy) < slop) return null;
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
}

/** Where the bubble is drawn for a horizontal finger travel of `dx`. */
export function swipeTravel(dx: number, side: SwipeSide): number {
  const sign = swipeSign(side);
  const along = dx * sign;
  if (along <= 0) return 0;
  const eased = along <= SWIPE_REPLY_AT ? along : SWIPE_REPLY_AT + (along - SWIPE_REPLY_AT) / 3;
  return Math.min(SWIPE_MAX, eased) * sign;
}

/** True when letting go at this travel sets the reply target. */
export function swipeCommits(dx: number, side: SwipeSide): boolean {
  return dx * swipeSign(side) >= SWIPE_REPLY_AT;
}
