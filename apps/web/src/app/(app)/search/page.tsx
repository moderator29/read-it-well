import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, formatNumber, getDictionary, type Locale } from "@naijafinds/i18n";
import { RealMap } from "@/components/app/search/RealMap";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { ListingCard } from "@/components/app/ListingCard";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: false },
};

/**
 * Discovery results.
 *
 * The map and full filter drawer are Phase 2. Everything visible here is
 * already real behaviour: free text and category filters run through the
 * listing repository, city chips jump straight to a destination, and sort
 * chips genuinely reorder results server side. Sorting works on integer kobo,
 * so no float maths.
 */

type SortKey = "recommended" | "top-rated" | "price-asc" | "price-desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "top-rated", label: "Top rated" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
];

/** Destination quick picks. Each chip is a shareable link, not client state. */
const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu", "Calabar"];

/**
 * Category labels for the results header. "property" is accepted as a legacy
 * alias for apartment so older links keep filtering.
 */
const KIND_NOUN: Record<ListingKind, { one: string; many: string }> = {
  hotel: { one: "hotel", many: "hotels" },
  apartment: { one: "apartment", many: "apartments" },
  home: { one: "home", many: "homes" },
  shortlet: { one: "shortlet", many: "shortlets" },
  villa: { one: "villa", many: "villas" },
  restaurant: { one: "restaurant", many: "restaurants" },
  experience: { one: "experience", many: "experiences" },
  rental: { one: "rental", many: "rentals" },
};

function parseKind(type: string | undefined): ListingKind | undefined {
  if (!type) return undefined;
  const normalised =
    type === "property" ? "apartment" : type === "rent" ? "rental" : type;
  return normalised in KIND_NOUN ? (normalised as ListingKind) : undefined;
}

function sortListings(listings: Listing[], sort: SortKey): Listing[] {
  const out = [...listings];
  switch (sort) {
    case "top-rated":
      out.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case "price-asc":
      out.sort((a, b) => a.priceMinor - b.priceMinor);
      break;
    case "price-desc":
      out.sort((a, b) => b.priceMinor - a.priceMinor);
      break;
    default:
      break;
  }
  return out;
}

function searchHref(
  q: string | undefined,
  type: string | undefined,
  sort: SortKey,
  view?: "map",
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (sort !== "recommended") params.set("sort", sort);
  if (view) params.set("view", view);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
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
  searchParams: Promise<{ q?: string; type?: string; sort?: string; view?: string }>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const { q, type, sort: rawSort, view: rawView } = await searchParams;

  const sort: SortKey = SORTS.some((s) => s.key === rawSort)
    ? (rawSort as SortKey)
    : "recommended";
  const kind = parseKind(type);
  const view = rawView === "map" ? "map" : "list";

  const repo = getListingRepository();
  const listings = sortListings(await repo.search({ q, kind }), sort);

  // The map reads the whole catalogue: every covered city keeps its pin and
  // lowest nightly price regardless of the current text filter.
  const cityFloor = new Map<string, { count: number; minMinor: number; currency: string }>();
  for (const l of await repo.search({})) {
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

  const noun = kind ? KIND_NOUN[kind] : { one: "stay", many: "stays" };

  return (
    <>
      {/* ------------------------------------------------ sticky search bar */}
      <div className="nf-glass sticky top-16 z-30 -mx-5 -mt-4 border-b border-[var(--nf-border-subtle)] px-5 py-3 md:-mx-8 md:px-8">
        <form action="/search" method="get" role="search" className="nf-card mx-auto flex max-w-3xl items-center gap-2 p-1.5">
          <label htmlFor="search-q" className="sr-only">
            {t.home.searchPlaceholder}
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
            <UiIcon name="search" size={18} className="shrink-0 text-[var(--nf-content-muted)]" />
            <input
              id="search-q"
              name="q"
              type="search"
              autoComplete="off"
              defaultValue={q ?? ""}
              placeholder={t.home.searchPlaceholder}
              className="w-full bg-transparent py-2 text-[0.9375rem] text-[var(--nf-content-primary)] outline-none placeholder:text-[var(--nf-content-muted)]"
            />
          </div>
          {type && <input type="hidden" name="type" value={type} />}
          {view === "map" && <input type="hidden" name="view" value="map" />}
          <button type="submit" className="nf-btn nf-btn--primary shrink-0 px-4 py-2 text-[0.875rem]">
            {t.common.search}
          </button>
        </form>

        {/* Trip frame. Dates and guests arrive with booking search in Phase 2;
            the controls hold the layout and say what they will do. */}
        <div className="mx-auto mt-2.5 flex max-w-3xl items-center gap-2">
          <button
            type="button"
            className="nf-chip flex-1 justify-center whitespace-nowrap text-[0.8125rem]"
          >
            <UiIcon name="calendar-booking" size={14} className="shrink-0 opacity-70" />
            Any week
          </button>
          <button
            type="button"
            className="nf-chip flex-1 justify-center whitespace-nowrap text-[0.8125rem]"
          >
            <UiIcon name="user" size={14} className="shrink-0 opacity-70" />
            2 guests
          </button>
        </div>

        {/* City quick picks. Links, so a tap submits instantly and is shareable. */}
        <nav aria-label="Popular destinations" className="nf-scroll-x -mx-5 mt-3 md:-mx-8">
          <ul className="flex gap-2 px-5 md:justify-center md:px-8">
            {CITIES.map((city) => {
              const active = q?.trim().toLowerCase() === city.toLowerCase();
              return (
                <li key={city} className="shrink-0">
                  <Link
                    href={searchHref(active ? undefined : city, type, sort)}
                    prefetch
                    aria-current={active ? "true" : undefined}
                    className={`nf-chip whitespace-nowrap transition-transform active:scale-[0.96] ${
                      active ? "nf-chip--active" : ""
                    }`}
                  >
                    <UiIcon name="location" size={13} className="shrink-0 opacity-70" />
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
              const active = sort === s.key;
              return (
                <li key={s.key} className="shrink-0">
                  <Link
                    href={searchHref(q, type, s.key)}
                    prefetch
                    aria-current={active ? "true" : undefined}
                    className={`nf-chip whitespace-nowrap transition-transform active:scale-[0.96] ${
                      active
                        ? "nf-chip--active font-bold text-[var(--nf-content-primary)]"
                        : ""
                    }`}
                  >
                    {active && (
                      <UiIcon name="verified" size={13} strokeWidth={2.2} className="shrink-0" />
                    )}
                    {s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* ---------------------------------------------------- results header */}
      <Reveal as="section" className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="nf-h3">
              {q ? (
                <>
                  Results for <span className="nf-gradient-text">&ldquo;{q}&rdquo;</span>
                </>
              ) : kind ? (
                `Explore ${KIND_NOUN[kind].many}`
              ) : (
                "Explore stays"
              )}
            </h1>
            <p className="mt-1 text-[0.8125rem] text-[var(--nf-content-muted)]">
              {formatNumber(listings.length, locale)}{" "}
              {listings.length === 1 ? noun.one : noun.many} across Nigeria
            </p>
          </div>
          <div className="flex items-center gap-2">
            {kind && (
              <Link
                href={searchHref(q, undefined, sort, view === "map" ? "map" : undefined)}
                className="text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
              >
                Clear category
              </Link>
            )}
            {/* List | Map. Real navigation, shareable like everything else. */}
            <Link
              href={
                view === "map" ? searchHref(q, type, sort) : searchHref(q, type, sort, "map")
              }
              prefetch
              className="nf-chip whitespace-nowrap text-[0.8125rem]"
            >
              <UiIcon name={view === "map" ? "grid" : "location"} size={14} className="shrink-0" />
              {view === "map" ? "List view" : "Map view"}
            </Link>
          </div>
        </div>
      </Reveal>

      {/* -------------------------------------------------------- map view */}
      {view === "map" && (
        <Reveal className="mt-5" delay={60}>
          <div className="nf-card relative overflow-hidden p-0">
            <RealMap
              active={q?.trim()}
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
      {view === "list" && (
      <Reveal className="mt-5" delay={60}>
        {listings.length === 0 ? (
          <div className="nf-card p-10 text-center">
            <p className="font-semibold">No places matched</p>
            <p className="mt-1 text-[0.875rem] text-[var(--nf-content-muted)]">
              Try a different search, or browse everything from the home screen.
            </p>
            <Link href="/home" className="nf-btn nf-btn--glass mt-6 inline-flex">
              {t.nav.home}
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        )}
      </Reveal>
      )}

      {/* --------------------------------------------------------- load more */}
      {view === "list" && listings.length > 0 && (
        <Reveal className="mt-8 text-center" delay={90}>
          {/*
           * Visual shell for pagination. The seed catalogue is fully shown, so
           * the button is disabled and says why instead of pretending more
           * exists.
           */}
          <button type="button" className="nf-btn nf-btn--glass" disabled={repo.isSeed}>
            Load more
          </button>
        </Reveal>
      )}
    </>
  );
}
