import { getDictionary } from "@vallo/i18n";
import { FilterDrawer } from "@/components/app/filters/FilterDrawer";
import { parseShelfQuery } from "@/components/app/search/shelf-query";
import type { ListingFacts } from "@/lib/listings/filter";
import { UNIT_SHAPES } from "@/lib/listings/unit-shape";

/**
 * The Filters sheet, open, with every unit shape and a boys' quarters present
 * in the pool, which no live catalogue has all of yet, so the Shape tiles and
 * the BQ row can be seen beside the Property type tiles. Fixtures only.
 *
 *   /preview/fixes/filters
 */
export const dynamic = "force-dynamic";

const KINDS = ["rental", "apartment", "home", "villa", "land", "shop", "office"] as const;

/** One listing per property kind, and one per unit shape (the last with a BQ). */
const FACTS = [
  ...KINDS.map((kind) => ({ kind })),
  ...UNIT_SHAPES.map((shape) => ({ kind: "rental" as const, unit: { shape, hasBq: shape === "boys_quarters" || shape === "detached" } })),
].map(
  (partial) =>
    ({
      priceMinor: 250_000_000,
      bedrooms: 2,
      bathrooms: 2,
      amenities: [],
      instantBook: false,
      verified: false,
      isDemo: false,
      source: "first-party",
      ...partial,
    }) as unknown as ListingFacts,
);

export default function PreviewFilters() {
  const t = getDictionary("en");
  return (
    <main className="min-h-dvh bg-[var(--nf-surface-canvas)] px-md pt-md">
      <FilterDrawer
        openOnMount
        query={parseShelfQuery({})}
        facts={FACTS}
        locale="en"
        copy={t.catalogue.filters}
        costCopy={t.moveIn}
        compoundCopy={t.shape.compound}
        sortCopy={t.shape.sorts}
        serviceCopy={t.shape.service}
        cashCopy={t.shape.cash}
        unitCopy={t.shape.unit}
        commuteCopy={t.shape.commute}
        kindCopy={t.experienceLabels}
      />
    </main>
  );
}
