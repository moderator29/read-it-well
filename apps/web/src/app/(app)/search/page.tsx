import type { Metadata } from "next";
import Link from "next/link";
import { formatNumber, getDictionary, type Locale } from "@naijafinds/i18n";
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
};

function parseKind(type: string | undefined): ListingKind | undefined {
  if (!type) return undefined;
  const normalised = type === "property" ? "apartment" : type;
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

function searchHref(q: string | undefined, type: string | undefined, sort: SortKey): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (sort !== "recommended") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; sort?: string }>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const { q, type, sort: rawSort } = await searchParams;

  const sort: SortKey = SORTS.some((s) => s.key === rawSort)
    ? (rawSort as SortKey)
    : "recommended";
  const kind = parseKind(type);

  const repo = getListingRepository();
  const listings = sortListings(await repo.search({ q, kind }), sort);

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
          <button type="submit" className="nf-btn nf-btn--primary shrink-0 px-4 py-2 text-[0.875rem]">
            {t.common.search}
          </button>
        </form>

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
          {kind && (
            <Link
              href={searchHref(q, undefined, sort)}
              className="text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
            >
              Clear category
            </Link>
          )}
        </div>
      </Reveal>

      {/* ------------------------------------------------------ results grid */}
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

      {/* --------------------------------------------------------- load more */}
      {listings.length > 0 && (
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
