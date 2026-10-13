import "./promotion.css";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import type { Listing } from "@/lib/listings/types";
import type { PromotionTierSlug } from "@/lib/promotion/tiers";
import { ListingCard } from "@/components/app/ListingCard";

/**
 * ONE PROMOTED SLOT (D3, `docs/promotion/VALLO_PROMOTION.md`, "What promotion
 * must never do").
 *
 * NOT MOUNTED ON A LIVE PAGE. Session 2's promotion inventory does not exist,
 * so nothing reads a slot yet; this is built and seen at `/preview/promotion`.
 * The day the inventory read exists, a surface places this beside its organic
 * results, never among them.
 *
 * THE FOUR RULES IT KEEPS, each held by `lib/trust/promotion-trust.test.ts`:
 *
 *   1. A SEPARATE INPUT. It takes one slot from the promotion inventory read,
 *      and nothing else: no organic list, no position in one, no sort. It
 *      cannot reorder, reweight or inject into organic results because it is
 *      never handed them (spec statement 2).
 *   2. ALWAYS LABELLED, in the member's own language (statement 3). A slot
 *      whose label would be empty draws nothing at all: an unlabelled promoted
 *      listing is the bug, and no listing is better than that one.
 *   3. THE SAME TRUST AS UNPROMOTED (statement 4, guardrail 5). The listing is
 *      handed to the same `ListingCard`, unchanged, so its Verified mark, its
 *      proof strip and its lister line are drawn by the code that draws them
 *      everywhere else, from the same fields. The slot adds a frame and a
 *      label and has no way to add, remove or restyle a trust signal.
 *   4. THE LABEL IS NOT A TRUST MARK. It wears the neutral badge, never the
 *      verified tone, so "Promoted" can never be read as "checked".
 */
export type PromotedSlotInput = {
  /** Session 2's inventory row for this slot. */
  slotId: string;
  tier: PromotionTierSlug;
  /** The listing, exactly as the organic read maps it. Never altered here. */
  listing: Listing;
};

export function PromotedSlot({
  slot,
  locale,
  t,
  index,
}: {
  slot: PromotedSlotInput;
  locale: Locale;
  t: Dictionary;
  index?: number;
}) {
  const label = t.experienceFeatures.promotion.label.trim();
  if (!label) return null;

  return (
    <section
      className="nf-promoted-slot"
      aria-label={t.experienceFeatures.promotion.labelLong}
      data-promoted-slot={slot.slotId}
      data-tier={slot.tier}
    >
      <p className="nf-promoted-slot__label">
        <span className="nf-badge nf-badge--neutral" data-testid="promoted-label">
          {label}
        </span>
      </p>
      <ListingCard listing={slot.listing} locale={locale} t={t} index={index} />
    </section>
  );
}
