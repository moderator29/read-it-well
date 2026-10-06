/**
 * PAID PROMOTION AS SEPARATE, LABELLED INVENTORY (handoff 7.13).
 *
 * The placements live in the database schema `promotion`, which anon and
 * authenticated cannot even see, so the organic ranking (lib/listings/ranking.ts,
 * read with member or anon credentials) has no path to them. A placement is
 * drawn only in a labelled slot, beside organic results and never inside
 * their order. The guardrails, from the founder's spec:
 *   - the organic formula stays untouched; ranking.test.ts asserts no paid input;
 *   - never imply guaranteed leads; never manufacture numbers (metrics are
 *     counted events only);
 *   - tier names say what you get; the verification badge is never for sale.
 *
 * NOT DONE HERE: lifting listings.featured=false. That lands with the ADR
 * superseding V-06 and the labelled-slot read, in one change.
 */

export const PROMOTION_TIERS = ["boost", "spotlight", "featured", "prime"] as const;
export type PromotionTier = (typeof PROMOTION_TIERS)[number];

/** The only label a promoted slot may carry. Fixed in the schema too (check constraint). */
export const PROMOTED_LABEL = "Promoted" as const;

export type PromotedSlot = {
  placementId: string;
  listingId: string;
  tier: PromotionTier;
  label: typeof PROMOTED_LABEL;
};

/**
 * Merge for display: organic results keep their order exactly; promoted
 * slots are returned separately and a listing never appears in both.
 * Returns new arrays; the organic input is never re-sorted.
 */
export function separatePromoted<T extends { id: string }>(
  organic: readonly T[],
  promoted: readonly PromotedSlot[],
): { organic: T[]; promoted: PromotedSlot[] } {
  const organicIds = new Set(organic.map((o) => o.id));
  return {
    organic: [...organic],
    promoted: promoted.filter((p) => p.label === PROMOTED_LABEL && !organicIds.has(p.listingId)),
  };
}
