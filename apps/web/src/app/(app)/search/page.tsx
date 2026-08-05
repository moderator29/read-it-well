import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { formatMoney, formatNumber, getDictionary, type Locale } from "@naijafinds/i18n";
import { RealMap } from "@/components/app/search/RealMap";
import { RecentStrip } from "@/components/app/search/RecentStrip";
import { SearchMemory } from "@/components/app/search/SearchMemory";
import { VIEW_COOKIE, isViewKey } from "@/lib/search/memory";
import { ActiveFilters } from "@/components/app/filters/ActiveFilters";
import { CategoryTiles } from "@/components/app/filters/CategoryTiles";
import { FilterDrawer } from "@/components/app/filters/FilterDrawer";
import { ViewToggle } from "@/components/app/filters/ViewToggle";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { factsOf } from "@/lib/listings/filter";
import {
  KIND_NOUN,
  SORTS,
  activeFilterCount,
  clearedFilters,
  parseDiscoveryQuery,
  toFilter,
  toPoolFilter,
  toSearchHref,
  type DiscoveryQuery,
  type SortKey,
} from "@/lib/listings/search-params";
import type { Listing } from "@/lib/listings/types";
import { ListingCard } from "@/components/app/ListingCard";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BrandIcon } from "@/design-system/icons/BrandIcon";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: false },
};

/**
 * Discovery results.
 *
 * Everything visible here is real behaviour, and all of it lives in the
 * address bar (`lib/listings/search-params.ts` is the contract): free text,
 * category, sort, view, budget, bedrooms, bathrooms, party size, amenities,
 * instant book and verified only. A filtered hunt is therefore a link, the
 * back button walks it backwards, and a reload lands on the same results.
 *
 * The filters themselves are not implemented on this page. They are the shared
 * matcher in `lib/listings/filter.ts` plus the SQL predicates in the Supabase
 * repository, so the seed catalogue, the platform catalogue and partner stock
 * all answer one definition of the request. This page asks the repository a
 * question and renders the answer.
 *
 * Sorting works on integer kobo, so no float maths.
 */

/** Destination quick picks. Each chip is a shareable link, not client state. */
const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu", "Calabar"];

/**
 * The tiebreaker: at EQUAL relevance, a verified place goes first.
 *
 * Verification on this platform is first-party inventory that a human reviewer
 * admitted, so it is the single strongest signal discovery has about whether a
 * place is real. It was not being used at all. Two stays at the same price, or
 * the same rating and the same number of reviews, came back in whatever order
 * the repository happened to hand over, and an unverified listing routinely sat
 * above a verified one for no reason anybody could name. That is the whole of
 * the defect: not that ranking was wrong, but that a fact we already hold was
 * being thrown away at exactly the moment it decides something.
 *
 * A TIEBREAKER, DELIBERATELY, AND NOT MORE THAN THAT. Verification does not
 * outrank a better price on a price sort or a better rating on a rating sort,
 * because the person chose that sort and it is not ours to overrule. It only
 * settles the cases the chosen sort leaves genuinely equal, which is the exact
 * wording of the requirement.
 */
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
      /*
       * Recommended has no numeric relevance score of its own: the repository's
       * order IS the relevance, first-party inventory ahead of partner stock.
       * So every position in it is a tie as far as this page can tell, and
       * verification settles all of them. `Array.prototype.sort` is stable, so
       * the repository's order survives intact inside each group.
       */
      out.sort(byVerification);
      break;
  }
  return out;
}

/**
 * Everything except the text box, as hidden fields, so submitting the search
 * form keeps the filters the traveller already set. Serialised by the same
 * function that writes every link on the page, so there is one contract.
 */
function carriedParams(query: DiscoveryQuery): [string, string][] {
  const href = toSearchHref(query);
  const index = href.indexOf("?");
  if (index === -1) return [];
  return [...new URLSearchParams(href.slice(index + 1))].filter(([key]) => key !== "q");
}

/**
 * A hunt in a few words, for the recent-searches chip.
 *
 * Built from the SAME parsed query that produced the results, so a chip can
 * never describe a search the page did not run. Returns "" when there is
 * nothing worth remembering: a bare `/search` with no text, no category and no
 * filters is not a hunt, and recording it every time somebody opened the tab
 * would push five real searches off the end of the list.
 */
function describeQuery(query: DiscoveryQuery, locale: Locale): string {
  const parts: string[] = [];
  if (query.q) parts.push(query.q);
  if (query.kind) parts.push(KIND_NOUN[query.kind].many);
  if (query.bedrooms !== undefined) parts.push(`${query.bedrooms}+ beds`);
  if (query.bathrooms !== undefined) parts.push(`${query.bathrooms}+ baths`);
  if (query.guests !== undefined) {
    parts.push(`${query.guests} ${query.guests === 1 ? "guest" : "guests"}`);
  }
  if (query.maxMinor !== undefined) parts.push(`under ${formatMoney(query.maxMinor, locale)}`);
  else if (query.minMinor !== undefined) parts.push(`over ${formatMoney(query.minMinor, locale)}`);
  if (query.amenities.length > 0) {
    parts.push(`${query.amenities.length} ${query.amenities.length === 1 ? "amenity" : "amenities"}`);
  }
  if (query.instantBook) parts.push("instant book");
  if (query.verifiedOnly) parts.push("verified");
  if (parts.length === 0) return "";
  return parts.join(", ").slice(0, 80);
}

/** Real coordinates for the covered cities. */
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
  const parsed = parseDiscoveryQuery(raw);

  /*
   * The remembered view, applied only when the address does not state one.
   *
   * An address that says `view=` always wins: a link somebody sent, a chip
   * somebody just tapped, and the back button are all explicit statements
   * about which view to show, and a stored preference must never overrule any
   * of them. The cookie exists for exactly one case, the person who arrives at
   * a bare `/search` from the tab bar or the home screen, and it is read on
   * the server so the map-preferring person gets a map in the first render
   * rather than a list that flips a beat later.
   */
  const remembered = (await cookies()).get(VIEW_COOKIE)?.value;
  const query: DiscoveryQuery =
    raw.view === undefined && isViewKey(remembered)
      ? { ...parsed, view: remembered }
      : parsed;

  const repo = getListingRepository();
  /*
   * Three questions, asked together:
   *
   *   results  the full request, with every filter applied by the repository.
   *   pool     the same text and category with no structured bounds. This is
   *            what the drawer counts against, so the number on its button is
   *            produced by the same matcher the server just ran, not guessed.
   *   whole    the catalogue, for the map's per-city floor.
   */
  const [rawResults, pool, whole] = await Promise.all([
    repo.search(toFilter(query)),
    repo.search(toPoolFilter(query)),
    repo.search({}),
  ]);
  const listings = sortListings(rawResults, query.sort);

  // The map reads the whole catalogue: every covered city keeps its pin and
  // lowest nightly price regardless of the current text filter.
  const cityFloor = new Map<string, { count: number; minMinor: number; currency: string }>();
  for (const l of whole) {
    // A floor needs a real price. Partner venues that come with a price level
    // rather than an amount carry 0 and must not become a city's "from" figure.
    if (l.priceMinor <= 0) continue;
    const entry = cityFloor.get(l.city);
    if (!entry) {
      cityFloor.set(l.city, { count: 1, minMinor: l.priceMinor, currency: l.currency });
    } else {
      entry.count += 1;
      entry.minMinor = Math.min(entry.minMinor, l.priceMinor);
    }
  }

  const noun = query.kind ? KIND_NOUN[query.kind] : { one: "stay", many: "stays" };
  const narrowed = activeFilterCount(query) > 0;

  return (
    <>
      {/* ------------------------------------------------ sticky search bar */}
      <div className="nf-glass sticky top-16 z-30 -mx-5 -mt-4 border-b border-[var(--nf-border-subtle)] px-5 py-3 md:-mx-8 md:px-8">
        {/* The bar and its filter control are siblings: the pill holds the
            query and its submit, the filter control sits beside it as its own
            glass square, which is how the reference reads and keeps the typing
            area uncluttered. */}
        <div className="mx-auto flex max-w-3xl items-center gap-2">
        <form
          action="/search"
          method="get"
          role="search"
          className="nf-card nf-focus-well flex min-w-0 flex-1 items-center gap-2 p-1.5"
        >
          <label htmlFor="search-q" className="sr-only">
            {t.home.searchPlaceholder}
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-3 px-2.5">
            <UiIcon name="search" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
            <input
              id="search-q"
              name="q"
              type="search"
              autoComplete="off"
              defaultValue={query.q ?? ""}
              placeholder={t.home.searchPlaceholder}
              className="min-h-11 w-full bg-transparent py-2 text-[0.9375rem] text-[var(--nf-content-primary)] outline-none placeholder:text-[var(--nf-content-muted)]"
            />
          </div>
          {/* Typing a new search must not silently drop the filters already set. */}
          {carriedParams(query).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          {/* At 390px the word plus the filter square left the field reading
              "Search places, ho...", so on phones the submit is its glyph and
              the words return once there is room for them. The accessible name
              is the word either way. */}
          <Button
            type="submit"
            variant="primary"
            aria-label={t.common.search}
            className="shrink-0"
          >
            <UiIcon name="search" size={20} className="sm:hidden" />
            <span className="hidden sm:inline">{t.common.search}</span>
          </Button>
        </form>
        <FilterDrawer
          query={query}
          facts={pool.map(factsOf)}
          locale={locale}
          openOnMount={raw.filters === "open"}
        />
        </div>

        {/* Categories: the markets we actually run, each one a link. */}
        <div className="mx-auto mt-3 max-w-3xl">
          <CategoryTiles query={query} t={t} />
        </div>

        {/* City quick picks. Links, so a tap submits instantly and is shareable. */}
        <nav aria-label="Popular destinations" className="nf-scroll-x -mx-5 mt-3 md:-mx-8">
          <ul className="flex gap-2 px-5 md:justify-center md:px-8">
            {CITIES.map((city) => {
              const active = query.q?.trim().toLowerCase() === city.toLowerCase();
              return (
                <li key={city} className="shrink-0">
                  <Link
                    href={toSearchHref({ ...query, q: active ? undefined : city })}
                    prefetch
                    aria-current={active ? "true" : undefined}
                    className={`nf-chip whitespace-nowrap transition-transform active:scale-[0.96] ${
                      active ? "nf-chip--active" : ""
                    }`}
                  >
                    <UiIcon name="location" size={12} className="shrink-0 opacity-70" />
                    {city}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sort chips. Links, not buttons: the sort is real and shareable. */}
        <nav aria-label="Sort results" className="nf-scroll-x -mx-5 mt-2.5 md:-mx-8">
          <ul className="flex gap-2 px-5 md:justify-center md:px-8">
            {SORTS.map((s) => {
              const active = query.sort === s.key;
              return (
                <li key={s.key} className="shrink-0">
                  <Link
                    href={toSearchHref({ ...query, sort: s.key })}
                    prefetch
                    aria-current={active ? "true" : undefined}
                    className={`nf-chip whitespace-nowrap transition-transform active:scale-[0.96] ${
                      active
                        ? "nf-chip--active font-bold text-[var(--nf-content-primary)]"
                        : ""
                    }`}
                  >
                    {active && (
                      <UiIcon name="verified" size={12} className="shrink-0" />
                    )}
                    {s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Nothing rendered. Records the view and the hunt for the strip below. */}
      <SearchMemory
        view={query.view}
        label={describeQuery(query, locale)}
        href={toSearchHref(query)}
      />

      {/* The last few hunts and the last few places opened. Empty on the
          server and on a first visit, so it costs nothing until it is real. */}
      <RecentStrip />

      {/* ---------------------------------------------------- results header */}
      <Reveal as="section" className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="nf-h3">
              {query.q ? (
                <>
                  Results for <span className="nf-gradient-text">&ldquo;{query.q}&rdquo;</span>
                </>
              ) : query.kind ? (
                `Explore ${KIND_NOUN[query.kind].many}`
              ) : (
                "Explore stays"
              )}
            </h1>
            {/*
             * The count is the number of cards below it, never a rounded or
             * inflated figure, and it says plainly whether filters produced it.
             */}
            <p
              data-testid="results-count"
              data-count={listings.length}
              className="mt-1 text-[0.8125rem] text-[var(--nf-content-muted)]"
            >
              {formatNumber(listings.length, locale)}{" "}
              {listings.length === 1 ? noun.one : noun.many}{" "}
              {narrowed ? "match your filters" : "across Nigeria"}
            </p>
          </div>
          <ViewToggle query={query} />
        </div>

        {/* Everything narrowing the results, each one removable in one tap. */}
        <ActiveFilters query={query} locale={locale} />
      </Reveal>

      {/* -------------------------------------------------------- map view */}
      {query.view === "map" && (
        <Reveal className="mt-5" delay={60}>
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
        <Reveal className="mt-5" delay={60}>
          {listings.length === 0 ? (
            <div className="nf-card p-10 text-center">
              <span className="nf-story-art mx-auto block h-20 w-20">
                <BrandIcon name="search-home" fill />
              </span>
              <p className="mt-4 font-semibold">No places matched</p>
              <p className="mt-1 text-[0.875rem] text-[var(--nf-content-muted)]">
                {narrowed
                  ? "Your filters are narrower than the catalogue right now. Widen them and the results come straight back."
                  : "Try a different search, or browse everything from the home screen."}
              </p>
              <div className="mt-6 flex justify-center">
                {narrowed ? (
                  <ButtonLink
                    href={toSearchHref(clearedFilters(query))}
                    prefetch
                    data-testid="empty-clear"
                    variant="primary"
                  >
                    Clear filters
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/home" variant="primary">
                    {t.nav.home}
                  </ButtonLink>
                )}
              </div>
              {narrowed && pool.length > 0 && (
                <p className="mt-3 text-[0.8125rem] text-[var(--nf-content-muted)]">
                  {formatNumber(pool.length, locale)}{" "}
                  {pool.length === 1 ? noun.one : noun.many} waiting without them
                </p>
              )}
            </div>
          ) : (
            <ul
              key={toSearchHref(query)}
              data-testid="results-grid"
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {listings.map((l, i) => (
                <li key={l.id}>
                  <ListingCard listing={l} locale={locale} t={t} index={i} />
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      )}

      {/* --------------------------------------------------------- load more */}
      {query.view === "list" && listings.length > 0 && (
        <Reveal className="mt-8 text-center" delay={90}>
          {/*
           * Visual shell for pagination. The catalogue is fully shown, so the
           * button is disabled and says why instead of pretending more exists.
           */}
          <Button variant="secondary" disabled={repo.isSeed}>
            Load more
          </Button>
        </Reveal>
      )}
    </>
  );
}
