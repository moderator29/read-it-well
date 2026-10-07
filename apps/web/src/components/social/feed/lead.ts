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

/**
 * WHICH POSTS ARE LEAD, BY ID, DECIDED ONCE (auditor A2, 6 October 2026).
 *
 * The stagger was keyed by position, so hiding or deleting one of the first
 * six pulled the seventh post into the lead (it gained the class and played its
 * entrance as if new), and going to another chip and back remounted all six and
 * replayed them. The lead is now the first six posts the feed was MOUNTED with,
 * by id, and the feed stops asking once they have played (`LEAD_SETTLE_MS`), so
 * a later remount is just the posts, there.
 */
export function leadIndexes(ids: readonly string[]): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  ids.slice(0, LEAD_COUNT).forEach((id, index) => map.set(id, index));
  return map;
}

/** The longest lead entrance: the last item's delay plus the 240ms arrival, with a margin. */
export const LEAD_SETTLE_MS = (LEAD_COUNT - 1) * LEAD_STEP_MS + 240 + 160;

/** The lead props for a post: the mounted lead only, and only until it has played. */
export function leadPropsFor(
  leads: ReadonlyMap<string, number>,
  id: string,
  settled: boolean,
): { className?: string; style?: CSSProperties } {
  if (settled) return {};
  const index = leads.get(id);
  return index === undefined ? {} : leadProps(index);
}
