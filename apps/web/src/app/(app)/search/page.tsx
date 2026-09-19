import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, formatNumber, getDictionary, type Locale } from "@vallo/i18n";
import { RealMap } from "@/components/app/search/RealMap";
import { ShelfBar } from "@/components/app/search/ShelfBar";
import { ShelfCount } from "@/components/app/search/ShelfCount";
import {
  clearedShelf,
  parseShelfQuery,
  shelfActiveCount,
  shelfFilter,
  shelfPoolFilter,
  toShelfHref,
  type ShelfQuery,
} from "@/components/app/search/shelf-query";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { factsOf } from "@/lib/listings/filter";
import {
  hasOwnRequest,
  intentKindsPresent,
  orderByStatedIntent,
} from "@/lib/listings/intent";
import { readIntentTuning } from "@/lib/interests/queries";
import { KIND_NOUN, type SortKey } from "@/lib/listings/search-params";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { ListingCard } from "@/components/app/ListingCard";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/Screen";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: false },
};

/**
 * Discovery results, to 3EB3E2A9.
 *
 * Everything visible here is real behaviour, and all of it lives in the
 * address bar (`lib/listings/search-params.ts` is the contract, plus the
 * market the shelf adds in `shelf-query.ts`): free text, category, market,
 * sort, view, budget, bedrooms, bathrooms, party size, amenities, instant
 * book, verified only, light and water. A filtered hunt is therefore a link,
 * the back button walks it backwards, and a reload lands on the same results.
 */

function sentenceCase(value: string): string {
  return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}

function byVerification(a: Listing, b: Listing): number {
  return Number(b.verified) - Number(a.verified);
}

function sortListings(listings: Listing[], sort: SortKey): Listing[] {
  const out = [...listings];
  switch (sort) {
    case "top-rated":
      out.sort(
        (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || byVerification(a, b),
      );
      break;
    case "price-asc":
      out.sort((a, b) => a.priceMinor - b.priceMinor || byVerification(a, b));
      break;
    case "price-desc":
      out.sort((a, b) => b.priceMinor - a.priceMinor || byVerification(a, b));
      break;
    default:
      // Recommended keeps the repository's order and lifts the checked rows.
      out.sort(byVerification);
      break;
  }
  return out;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Ibadan: { lat: 7.3775, lng: 3.947 },
  Abuja: { lat: 9.0765, lng: 7.3986 },
  Enugu: { lat: 6.4584, lng: 7.5464 },
  "Port Harcourt": { lat: 4.8156, lng: 7.0498 },
  Calabar: { lat: 4.9757, lng: 8.3417 },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const raw = await searchParams;
  const query: ShelfQuery = parseShelfQuery(raw);

  const repo = getListingRepository();
  /* Three reads: the results, the pool the sheet counts against (the whole
     catalogue for the current text), and the whole catalogue for the map. */
  const [rawResults, pool, whole] = await Promise.all([
    repo.search(shelfFilter(query)),
    repo.search(shelfPoolFilter(query)),
    repo.search({}),
  ]);
  const sorted = sortListings(rawResults, query.sort);

  /* A stated interest reorders an unfiltered shelf and nothing else. */
  const tuning = await readIntentTuning();
  const statedIntent = hasOwnRequest(query) ? [] : tuning.interests;
  const listings = orderByStatedIntent(sorted, statedIntent);
  const intentApplied = listings !== sorted;
  const intentKinds: ListingKind[] = intentApplied
    ? intentKindsPresent(listings, statedIntent)
    : [];

  // The map reads the whole catalogue: every covered city keeps its pin and
  // lowest price regardless of the current text filter.
  const cityFloor = new Map<string, { count: number; minMinor: number; currency: string }>();
  for (const l of whole) {
    if (l.priceMinor <= 0) continue;
    const entry = cityFloor.get(l.city);
    if (!entry) {
      cityFloor.set(l.city, { count: 1, minMinor: l.priceMinor, currency: l.currency });
    } else {
      entry.count += 1;
      entry.minMinor = Math.min(entry.minMinor, l.priceMinor);
    }
  }

  const noun = query.kind ? KIND_NOUN[query.kind] : { one: "place", many: "places" };
  const narrowed = shelfActiveCount(query) > 0 || Boolean(query.kind);
  const poolInKind = query.kind ? pool.filter((l) => l.kind === query.kind) : pool;

  return (
    <>
      <ShelfBar
        query={query}
        facts={pool.map(factsOf)}
        locale={locale}
        t={t}
        openFilters={raw.filters === "open"}
      />

      <h1 className="sr-only">
        {query.q ? `Results for ${query.q}` : query.kind ? `Explore ${noun.many}` : "Explore properties"}
      </h1>

      <ShelfCount query={query} count={listings.length} narrowed={narrowed || Boolean(query.q)} locale={locale} t={t} />

      {/* Says why the order is what it is, and only when it really is. */}
      {intentApplied && intentKinds.length > 0 && (
        <p
          data-testid="intent-note"
          data-intent={intentKinds.join(",")}
          className="nf-caption mt-inline text-[var(--nf-content-muted)]"
        >
          {sentenceCase(intentKinds.map((kind) => KIND_NOUN[kind].many).join(", "))} first,
          because that is what you said you came for. Search or filter and this stops.
        </p>
      )}

      {/* -------------------------------------------------------- map view */}
      {query.view === "map" && (
        <Reveal className="mt-md" delay={60}>
          <a href="#map-view" className="nf-skip-link">
            Skip to the map
          </a>
          <div className="nf-card relative overflow-hidden p-0">
            <RealMap
              active={query.q?.trim()}
              pins={Object.entries(CITY_COORDS).flatMap(([city, at]) => {
                const floor = cityFloor.get(city);
                if (!floor) return [];
                return [
                  {
                    city,
                    ...at,
                    count: floor.count,
                    price: formatMoney(floor.minMinor, locale, floor.currency),
                  },
                ];
              })}
            />
          </div>
        </Reveal>
      )}

      {/* ------------------------------------------------------ results grid */}
      {query.view === "list" && (
        <div className="mt-md">
          {listings.length === 0 ? (
            <EmptyState
              className="pb-4xl"
              icon="search-home"
              title={narrowed || query.q ? "No places matched" : "Nothing on the shelves yet"}
              body={
                narrowed
                  ? "Your filters are narrower than the catalogue right now. Widen them and the results come straight back."
                  : query.q
                    ? "Nothing here matches those words yet. Try a place name, or a state."
                    : "Agents are still listing. When a place goes live it appears here the same minute, and there is nothing to wait for on your side."
              }
              action={
                narrowed ? (
                  <ButtonLink
                    href={toShelfHref(clearedShelf(query))}
                    prefetch
                    data-testid="empty-clear"
                    variant="primary"
                  >
                    Clear filters
                  </ButtonLink>
                ) : query.q ? (
                  <ButtonLink href="/search" prefetch data-testid="empty-clear-search" variant="primary">
                    Clear this search
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/profile?switch=owner" variant="primary" data-testid="empty-list-place">
                    List your place
                  </ButtonLink>
                )
              }
              secondary={
                narrowed && poolInKind.length > 0 ? (
                  <span className="nf-body-sm text-[var(--nf-content-muted)]">
                    {formatNumber(poolInKind.length, locale)}{" "}
                    {poolInKind.length === 1 ? noun.one : noun.many} waiting without them
                  </span>
                ) : !narrowed && !query.q ? (
                  <Link href="/docs" className="nf-link-quiet nf-body text-[var(--nf-content-link)]">
                    How Vallo works
                  </Link>
                ) : undefined
              }
            />
          ) : (
            /* Two across on a phone, four from `lg`: the decision a person is
               making here is a comparison, and you cannot compare things you
               can only see one at a time. */
            <ul
              key={toShelfHref(query)}
              data-testid="results-grid"
              className="grid grid-cols-2 gap-sm sm:gap-md lg:grid-cols-4"
            >
              {listings.map((l, i) => (
                <li key={l.id}>
                  <ListingCard
                    listing={l}
                    locale={locale}
                    t={t}
                    index={i}
                    dense
                    intent={tuning.signedIn ? tuning.interests : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {query.view === "list" && listings.length > 0 && repo.isSeed && (
        <p className="nf-caption mt-block text-center text-[var(--nf-content-muted)]">
          That is everything matching this search.
        </p>
      )}
    </>
  );
}
