import { formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { factsOf } from "@/lib/listings/filter";
import { forListingCard } from "@/lib/i18n/slice";
import type { ListingKind } from "@/lib/listings/types";
import { ShelfBar } from "@/components/app/search/ShelfBar";
import { ShelfCount } from "@/components/app/search/ShelfCount";
import { parseShelfQuery, toShelfViewHref } from "@/components/app/search/shelf-query";
import { ListingCard } from "@/components/app/ListingCard";
import { SearchForYou } from "@/components/app/search/SearchForYou";
import { RealMap } from "@/components/app/search/RealMap";
import { WideOnly } from "@/components/app/search/WideOnly";
import { MapListPill } from "@/components/app/search/MapListPill";
import { LastVisitProvider } from "@/components/app/search/LastVisit";
import { savedSearchSignal } from "@/lib/search/saved-search-signal";
import { HARNESS_NOW, HARNESS_SAVED_HOMES, HARNESS_SAVED_SEARCH_PARAMS, SEARCH_SHELF } from "./fixtures";

/**
 * /search, upgraded, with fixture rows (search-map track): the real bar with
 * its quick chips, the real sheet (open on `?filters=open`), Best matches and
 * New listings from fixture signals, the one-per-row list, the sticky map on
 * a desktop, and the map view on `?view=map`. The same components the route
 * draws, composed the way the route composes them.
 */
const CITY = { Lagos: { lat: 6.5244, lng: 3.3792 } };

export default async function SearchMapPreview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const raw = await searchParams;
  const query = parseShelfQuery(raw);
  const listings = SEARCH_SHELF;
  const card = forListingCard(t);
  const pins = [
    { city: "Lagos", ...CITY.Lagos, count: listings.length, price: formatMoney(Math.min(...listings.map((l) => l.priceMinor)), locale) },
  ];
  const kindNames = Object.fromEntries(
    Object.entries(t.experienceLabels.kinds).map(([kind, noun]) => [kind, noun.one]),
  ) as Record<ListingKind, string>;
  const newest = listings
    .filter((l) => l.publishedAt && HARNESS_NOW - Date.parse(l.publishedAt) <= 30 * 24 * 60 * 60 * 1000)
    .sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!))
    .slice(0, 8);

  return (
    <>
      <ShelfBar
        query={query}
        facts={listings.map(factsOf)}
        locale={locale}
        t={t}
        openFilters={raw.filters === "open"}
      />
      <ShelfCount query={query} count={listings.length} narrowed={false} locale={locale} t={t} />

      {query.view === "map" ? (
        <div className="nf-panel nf-panel--card relative mt-md overflow-hidden p-0">
          <RealMap listHref={toShelfViewHref(query, "list")} listings={listings} pins={pins} />
        </div>
      ) : (
        <LastVisitProvider>
          <SearchForYou
            candidates={listings}
            newest={newest}
            savedSearches={[savedSearchSignal(HARNESS_SAVED_SEARCH_PARAMS)]}
            savedHomes={HARNESS_SAVED_HOMES}
            interests={["rental"]}
            savedIds={HARNESS_SAVED_HOMES.map((h) => h.id)}
            kindNames={kindNames}
            ownershipSeen={{ [listings[0]!.id]: "2026-10-10T09:00:00Z" }}
            ownershipLabel={t.supply.register.owner.proof.seenMark}
            locale={locale}
            t={card}
            copy={{
              bestMatches: t.searchV2.sections.bestMatches,
              bestMatchesHint: t.searchV2.sections.bestMatchesHint,
              newListings: t.searchV2.sections.newListings,
              reasons: t.searchV2.reasons,
            }}
          />
          <div className="nf-search-split">
            <div className="min-w-0">
              <h2 className="nf-sx-section__title nf-sx-allhead">{t.searchV2.sections.allHomes}</h2>
              <ul className="nf-results--one" data-testid="results-grid">
                {listings.map((listing, i) => (
                  <li key={listing.id}>
                    <ListingCard
                      listing={listing}
                      locale={locale}
                      t={card}
                      index={i}
                      layout="row"
                      brief
                      messageAgent
                      saved={HARNESS_SAVED_HOMES.some((h) => h.id === listing.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <aside className="nf-search-aside nf-panel nf-panel--card p-0" aria-label={t.searchV2.map.aside}>
              <WideOnly>
                <RealMap listHref={toShelfViewHref(query, "list")} listings={listings} pins={pins} fill />
              </WideOnly>
            </aside>
          </div>
        </LastVisitProvider>
      )}
      <MapListPill
        href={toShelfViewHref(query, query.view === "map" ? "list" : "map")}
        to={query.view === "map" ? "list" : "map"}
      />
    </>
  );
}
