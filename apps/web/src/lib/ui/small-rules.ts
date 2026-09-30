/**
 * The small things' decisions, pure, so each is tested without a DOM
 * (details pass, 30 September 2026). The components that act on them are
 * `BackToTop`, `PullToRefresh` and the field counter in `Field`.
 */

/**
 * Back to top is offered only when it is useful: the page is long (four
 * screens or more), the reader is well down it (past two screens), and they
 * have just started scrolling UP, the moment somebody looks for the top.
 */
export function shouldOfferTop(input: {
  scrollY: number;
  viewport: number;
  pageHeight: number;
  scrollingUp: boolean;
}): boolean {
  const { scrollY, viewport, pageHeight, scrollingUp } = input;
  if (viewport <= 0) return false;
  return scrollingUp && pageHeight >= viewport * 4 && scrollY > viewport * 2;
}

/** The pull that arms a refresh, and the furthest the disc comes down. */
export const PULL_THRESHOLD_PX = 64;
export const PULL_MAX_PX = 96;

/** How far the disc has come for a finger's travel: half, with a ceiling. */
export function pullDistance(fingerPx: number): number {
  if (fingerPx <= 0) return 0;
  return Math.min(PULL_MAX_PX, fingerPx * 0.5);
}

/**
 * The character counter: silent until the reader is near the limit (the
 * last fifth, or the last 10, whichever is more), then "132 / 140" in the
 * muted ink, turning to the error ink at the limit. Numbers only, so it
 * needs no words in any locale.
 */
export function counterFor(length: number, max: number | undefined): { show: boolean; over: boolean } {
  if (!max || max <= 0) return { show: false, over: false };
  const near = Math.max(10, Math.ceil(max * 0.2));
  return { show: length >= max - near, over: length >= max };
}
