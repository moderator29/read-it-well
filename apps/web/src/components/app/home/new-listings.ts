import type { Listing } from "@/lib/listings/types";

/**
 * NEWEST PUBLISHED FIRST, BY THE DATE THE LISTING FIRST WENT LIVE.
 *
 * `published_at` is written by the review desk only when it is empty, so a
 * listing sent back to draft and published again keeps its age and cannot jump
 * the queue, and nobody can buy a fresher copy (there is no push-up to buy).
 * A row with no date, or one that does not parse, has no honest age and goes
 * last rather than first. Equal dates keep the order they came in.
 *
 * Pure, so the order is proved without a database.
 */
const publishedAt = (listing: Listing): number => {
  const at = Date.parse(listing.publishedAt ?? "");
  return Number.isFinite(at) ? at : 0;
};

export function newestFirst(listings: readonly Listing[], limit: number): Listing[] {
  return listings
    .map((listing, index) => ({ listing, index }))
    .sort((a, b) => publishedAt(b.listing) - publishedAt(a.listing) || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.listing);
}
