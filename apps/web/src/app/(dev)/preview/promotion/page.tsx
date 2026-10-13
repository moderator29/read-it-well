import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { BackButton } from "@/components/site/BackButton";
import { ListingCard } from "@/components/app/ListingCard";
import { PromotedRail } from "@/components/promotion/PromotedRail";
import { PromotedSlot, type PromotedSlotInput } from "@/components/promotion/PromotedSlot";
import { PromotionPurchase } from "@/components/promotion/PromotionPurchase";
import { PromotionResults } from "@/components/promotion/PromotionResults";
import { LISTER_GAPS, measurementRows, sourceSplit, type ListingMeasurement } from "@/lib/promotion/measurement";
import { lagosToday } from "@/lib/agent/calendar-model";
import { PROMOTION_METRICS } from "@/lib/promotion/tiers";
import { RENTAL, SALE, SHELF } from "../f3/fixtures";

/**
 * PAID PROMOTION'S PIECES, AGAINST FIXTURES (D3, D60). Dev only, behind the
 * harness's own gate (`layout.tsx`).
 *
 * The promoted slot is not mounted on any live page until Session 2's
 * inventory read exists, so this is where it is seen: each fixture listing
 * drawn plain and inside a slot, side by side, so the label is visible and
 * the card (its Verified mark, proof strip and lister line) is the same.
 * Then the front door rail sold out (six: Everywhere two, Featured four) and
 * on a day that is not (two cards, same width and gap, no padding), the
 * purchase section with each day state the sale can answer, and the results
 * screen with no figure at all: the read's gaps and its reasons, no number
 * invented. The fixtures are the catalogue harness's
 * (`app/(dev)/preview/f3/fixtures.ts`); nothing here is a real listing,
 * price paid or result.
 */
export default function PromotionPreview() {
  const locale = "en" as const;
  const t = getDictionary(locale);
  const p = t.experienceFeatures.promotion;
  const listings = [RENTAL, SHELF[1] ?? RENTAL];
  const pool = [RENTAL, SALE, ...SHELF];
  const tiers = ["prime", "prime", "featured", "featured", "featured", "featured"] as const;
  const soldOut: PromotedSlotInput[] = tiers.map((tier, i) => ({ slotId: `preview-rail-${i}`, tier, listing: pool[i % pool.length]! }));
  /* A measurement with every figure no data and its reason: the shape, never a number. */
  const noFigures: ListingMeasurement = {
    windowDays: 30,
    values: Object.fromEntries(PROMOTION_METRICS.map((metric) => [metric, null])) as ListingMeasurement["values"],
    gaps: { ...LISTER_GAPS, inquiries: "readFailed", contacts: "readFailed", viewings: "readFailed", bookings: "readFailed" },
  };
  const today = lagosToday();

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

      <section className="flex flex-col gap-md" aria-labelledby="rail-full">
        <h2 id="rail-full" className="nf-section-label">
          The front door rail, sold out: six places
        </h2>
        <PromotedRail slots={soldOut} locale={locale} t={t} />
      </section>

      <section className="flex flex-col gap-md" aria-labelledby="rail-two">
        <h2 id="rail-two" className="nf-section-label">
          The same rail on a day with two places sold
        </h2>
        <PromotedRail slots={soldOut.slice(0, 2)} locale={locale} t={t} />
      </section>

      <section className="flex max-w-2xl flex-col gap-md" aria-labelledby="buy">
        <h2 id="buy" className="nf-section-label">
          The purchase section: Featured full on the rail, Everywhere open
        </h2>
        <PromotionPurchase
          days={{
            featured: { state: "full", tier: "featured", day: today, reason: "tier-full", nextFree: null },
            prime: { state: "open", tier: "prime", day: today, free: 1 },
          }}
          copy={p}
          locale={locale}
        />
      </section>

      <section className="flex max-w-2xl flex-col gap-md" aria-labelledby="results">
        <h2 id="results" className="nf-section-label">
          The results screen, every figure no data, with its reason
        </h2>
        <PromotionResults
          rows={measurementRows(noFigures)}
          split={sourceSplit(noFigures)}
          notice={{ title: p.measure.baselineTitle, body: p.measure.baselineBody }}
          copy={p}
          locale={locale}
        />
      </section>
    </main>
  );
}
