import "./promotion.css";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { PROMOTION_FULL_DAYS, PROMOTION_NOT_ON_SALE, PROMOTION_TIERS_CAPTION } from "@/lib/money/copy";
import { frontDoorCountText, frontDoorDayLines, tierPriceLine, type FrontDoorDay } from "@/lib/promotion/front-door";
import { isFrontDoorTier, promotionTiers, type FrontDoorTierSlug } from "@/lib/promotion/tiers";

/**
 * CHOOSING A TIER, BEFORE ANY PAYMENT (`VALLO_PROMOTION-v2.md` section 11).
 *
 * The four tiers by reach (Boost, Spotlight, Featured, Everywhere), each with
 * its confirmed price, its days and its naira a day; then the published front
 * door count (six a day per city, Everywhere at most two, Featured at most
 * four), said BEFORE payment; then, per front door tier, the day as Session
 * 2's sale answers it: free places, or full with the named reason and the
 * next free day (`FrontDoorDay`). The sale is Session 2's, and buying is not
 * open until the payment account exists (D38), so there is no pay button:
 * the section says so in Session 2's sentence.
 */
export function PromotionPurchase({
  days,
  copy,
  locale,
}: {
  /** Per front door tier, the day's answer from the inventory read. */
  days: Partial<Record<FrontDoorTierSlug, FrontDoorDay>>;
  copy: Dictionary["experienceFeatures"]["promotion"];
  locale: Locale;
}) {
  const p = copy;
  return (
    <section className="nf-promo-buy" aria-labelledby="promo-buy" data-testid="promotion-purchase">
      <div>
        <h2 id="promo-buy" className="nf-section-label">
          {p.purchase.title}
        </h2>
        <p className="nf-promo-buy__line">{PROMOTION_TIERS_CAPTION}</p>
      </div>
      <ol className="nf-promo-buy__tiers">
        {promotionTiers().map((tier) => {
          const day = isFrontDoorTier(tier.slug) ? days[tier.slug] : undefined;
          const lines = day ? frontDoorDayLines(day, p, locale) : [];
          return (
            <li key={tier.slug} className="nf-promo-buy__tier" data-tier={tier.slug}>
              <p className="nf-promo-buy__name">{p.tiers[tier.displayKey].name}</p>
              <p className="nf-promo-buy__price">{tierPriceLine(tier, locale)}</p>
              <p className="nf-promo-buy__line">{p.tiers[tier.displayKey].forWhom}</p>
              {lines.map((line) => (
                <p key={line} className="nf-promo-buy__line" data-day-state={day?.state}>
                  {line}
                </p>
              ))}
            </li>
          );
        })}
      </ol>
      <p className="nf-promo-buy__line" data-testid="promotion-front-door-count">
        {frontDoorCountText(p, locale)} {PROMOTION_FULL_DAYS}
      </p>
      <p className="nf-promo-buy__line">{PROMOTION_NOT_ON_SALE}</p>
    </section>
  );
}
