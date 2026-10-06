import type { CSSProperties } from "react";

/**
 * THE FIRST SIX, AS DATA (motion 10, list stagger).
 *
 * A feed or a thread staggers its first six items 40ms apart and nothing after
 * them: the seventh would arrive with the sixth, and past the fold the cards
 * are scroll-driven (`feed-m.css`). This is the one place that says which
 * items are "lead" and what their order is, so `Feed` and `ThreadView` cannot
 * disagree about six.
 *
 * Returns `{}` for everything after the sixth, so spreading it is always safe.
 */
export const LEAD_COUNT = 6;
export const LEAD_STEP_MS = 40;

export function leadProps(index: number): { className?: string; style?: CSSProperties } {
  if (index < 0 || index >= LEAD_COUNT) return {};
  return { className: "nf-feed-lead", style: { "--nf-i": index } as CSSProperties };
}
