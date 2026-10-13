/**
 * C5: what a selection of listings can have done to it, pure and tested.
 *
 * Each bulk action loops through the SAME per-listing server action the row
 * uses (`submitListing`, `unpublishListing`), so every guard and every audit
 * row is exactly what one tap would have produced. The only new write is
 * "still available", which is one call for the lot.
 */
import type { ListingStatus } from "@/lib/agent/listings-model";

export type BulkListing = { id: string; status: ListingStatus; intent: string };

export type BulkPlan = {
  /** Live: confirm still available. */
  confirm: string[];
  /** Live and not a rental (a live rental is closed with a reason, one at a time). */
  takeDown: string[];
  /** Drafts and listings sent back: send for review. */
  submit: string[];
};

const SUBMITTABLE: ListingStatus[] = ["DRAFT", "MORE_INFO_REQUIRED", "REJECTED"];

export function planBulk(listings: readonly BulkListing[], selected: readonly string[]): BulkPlan {
  const chosen = listings.filter((l) => selected.includes(l.id));
  return {
    confirm: chosen.filter((l) => l.status === "PUBLISHED").map((l) => l.id),
    takeDown: chosen.filter((l) => (l.status === "PUBLISHED" || l.status === "APPROVED") && l.intent !== "rent").map((l) => l.id),
    submit: chosen.filter((l) => SUBMITTABLE.includes(l.status)).map((l) => l.id),
  };
}

/**
 * Shift-click: every id between the last one toggled and this one, in the
 * order the screen shows them, takes this one's new state.
 */
export function rangeToggle(
  order: readonly string[],
  selected: readonly string[],
  anchor: string | null,
  id: string,
  on: boolean,
): string[] {
  const from = anchor ? order.indexOf(anchor) : -1;
  const to = order.indexOf(id);
  if (from === -1 || to === -1) {
    return on ? [...new Set([...selected, id])] : selected.filter((s) => s !== id);
  }
  const [lo, hi] = from < to ? [from, to] : [to, from];
  const span = order.slice(lo, hi + 1);
  return on ? [...new Set([...selected, ...span])] : selected.filter((s) => !span.includes(s));
}

/** "9 done. 2 could not: <first reason>." */
export function bulkSummary(done: number, failures: string[]): string {
  const head = `${done} done.`;
  if (failures.length === 0) return head;
  return `${head} ${failures.length} could not: ${failures[0]}`;
}
