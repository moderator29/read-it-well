import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { formatMoney } from "@vallo/i18n/core";
import { BackButton } from "@/components/site/BackButton";
import { ListingCard } from "@/components/app/ListingCard";
import { PromotedSlot } from "@/components/promotion/PromotedSlot";
import { PromotionResults } from "@/components/promotion/PromotionResults";
import { measurementRows } from "@/lib/promotion/measurement";
import { promotionTiers } from "@/lib/promotion/tiers";
import { RENTAL, SHELF } from "../f3/fixtures";

/**
 * PAID PROMOTION'S PIECES, AGAINST FIXTURES (D3, D60). Dev only, behind the
 * harness's own gate (`layout.tsx`).
 *
 * The promoted slot is not mounted on any live page until Session 2's
 * inventory read exists, so this is where it is seen: each fixture listing
 * drawn plain and inside a slot, side by side, so the label is visible and
 * the card (its Verified mark, proof strip and lister line) is the same.
 * Then the four tiers as the onboarding lists them, and the results screen
 * in its not-live state: every figure "No data". The fixtures are the
 * catalogue harness's (`f3/fixtures.ts`); nothing here is a real listing,
 * price paid or result.
 */
export default function PromotionPreview() {
  const locale = "en" as const;
  const t = getDictionary(locale);
  const p = t.experienceFeatures.promotion;
  const listings = [RENTAL, SHELF[1] ?? RENTAL];

  return (
    <main className="nf-shell flex flex-col gap-section py-section">
      <div>
        <BackButton fallback="/preview" />
        <h1 className="nf-h2 mt-sm">Promotion</h1>
        <p className="nf-body-sm mt-2xs text-[var(--nf-content-secondary)]">
          Fixtures only. The first run is at{" "}
          <Link className="nf-link" href="/first-run/promotion">
            /first-run/promotion
          </Link>
          .
        </p>
      </div>

      <section className="flex flex-col gap-md" aria-labelledby="slot">
        <h2 id="slot" className="nf-section-label">
          The promoted slot, beside the same listing unpromoted
        </h2>
        {listings.map((listing, index) => (
          <div key={listing.id} className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <div className="flex flex-col gap-xs">
              <p className="nf-caption text-[var(--nf-content-muted)]">Unpromoted</p>
              <ListingCard listing={listing} locale={locale} t={t} index={index} />
            </div>
            <div className="flex flex-col gap-xs">
              <p className="nf-caption text-[var(--nf-content-muted)]">In a slot</p>
              <PromotedSlot slot={{ slotId: `preview-${index}`, tier: "boost", listing }} locale={locale} t={t} index={index} />
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-md" aria-labelledby="tiers">
        <h2 id="tiers" className="nf-section-label">
          The four tiers
        </h2>
        <dl className="grid gap-sm">
          {promotionTiers().map((tier) => (
            <div key={tier.slug} className="flex flex-col gap-3xs">
              <dt className="nf-body font-semibold">
                {p.tiers[tier.displayKey].name}{" "}
                <span className="font-normal text-[var(--nf-content-secondary)]">
                  {p.tierMeta
                    .replace("{price}", formatMoney(tier.proposedPriceKobo, locale))
                    .replace("{days}", String(tier.durationDays))}
                </span>
              </dt>
              <dd className="nf-body-sm m-0 text-[var(--nf-content-secondary)]">{p.tiers[tier.displayKey].forWhom}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex max-w-2xl flex-col gap-md" aria-labelledby="results">
        <h2 id="results" className="nf-section-label">
          The results screen, before any promotion has run
        </h2>
        <PromotionResults rows={measurementRows({ state: "not-live" })} notLive copy={p} locale={locale} />
      </section>
    </main>
  );
}
