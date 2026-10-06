/**
 * The page list a `SlidePagination` draws, as a pure function so the arithmetic
 * is provable without a browser. Kept beside the component (a `.ts` file) so
 * the unit project can import it, which it cannot do for a `.tsx` component.
 *
 * Always shows the first and last page, the current page with `siblings` pages
 * either side, and an "ellipsis" marker for each run that is left out. A run of
 * exactly one page is shown as that page rather than as an ellipsis, because an
 * ellipsis standing in for a single number is longer to read than the number.
 *
 * The count of slots is stable as the page moves (`siblings * 2 + 5` once there
 * are enough pages), which is what lets the sliding indicator travel between
 * slots without the row reflowing under it.
 */
export type PageSlot = number | "start-gap" | "end-gap";

export function paginationRange(page: number, pageCount: number, siblings = 1): PageSlot[] {
  const total = Math.max(0, Math.floor(pageCount));
  if (total === 0) return [];
  const current = Math.min(Math.max(1, Math.floor(page)), total);
  const sib = Math.max(0, Math.floor(siblings));
  const slots = sib * 2 + 5;
  if (total <= slots) return Array.from({ length: total }, (_, i) => i + 1);

  const left = Math.max(current - sib, 1);
  const right = Math.min(current + sib, total);
  const showStartGap = left > 3;
  const showEndGap = right < total - 2;

  if (!showStartGap && showEndGap) {
    const head = sib * 2 + 3;
    return [...Array.from({ length: head }, (_, i) => i + 1), "end-gap", total];
  }
  if (showStartGap && !showEndGap) {
    const tail = sib * 2 + 3;
    return [1, "start-gap", ...Array.from({ length: tail }, (_, i) => total - tail + 1 + i)];
  }
  return [
    1,
    "start-gap",
    ...Array.from({ length: right - left + 1 }, (_, i) => left + i),
    "end-gap",
    total,
  ];
}
