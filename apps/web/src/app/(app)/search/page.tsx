import type { Metadata } from "next";
import Link from "next/link";
import { formatNumber, getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import type { Listing } from "@/lib/listings/types";
import { ListingCard } from "@/components/app/ListingCard";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: false },
};

/**
 * Discovery results shell.
 *
 * The live search engine, map and full filters are Phase 2. This shell already
 * behaves like the real surface: a sticky compact search bar, sort chips that
 * genuinely reorder results, and the shared listing grid, all fed by the seed
 * repository and labelled as sample content wherever a count or result is
 * claimed (Master Rule 8). Sorting works on integer kobo, so no float maths.
 */

type SortKey = "recommended" | "top-rated" | "price-asc" | "price-desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "top-rated", label: "Top rated" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
];

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

function chipHref(q: string | undefined, type: string | undefined, sort: SortKey): string {
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

  const repo = getListingRepository();
  const listings = sortListings(await repo.recommended(6), sort);

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

        {/* Sort chips. Links, not buttons: the sort is real and shareable. */}
        <nav aria-label="Sort results" className="nf-scroll-x -mx-5 mt-3 md:-mx-8">
          <ul className="flex gap-2 px-5 md:justify-center md:px-8">
            {SORTS.map((s) => (
              <li key={s.key} className="shrink-0">
                <Link
                  href={chipHref(q, type, s.key)}
                  aria-current={sort === s.key ? "true" : undefined}
                  className={`nf-chip whitespace-nowrap ${sort === s.key ? "nf-chip--active" : ""}`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
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
              ) : (
                "Explore stays"
              )}
            </h1>
            <p className="mt-1 text-[0.8125rem] text-[var(--nf-content-muted)]">
              {formatNumber(listings.length, locale)}
              {repo.isSeed ? " sample " : " "}
              {listings.length === 1 ? "stay" : "stays"}
              {type ? ` in ${type}` : ""} across Nigeria
            </p>
          </div>
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
           * Visual shell for pagination. The seed set is fully shown, so the
           * button is disabled and says why instead of pretending more exists.
           */}
          <button type="button" className="nf-btn nf-btn--glass" disabled={repo.isSeed}>
            Load more
          </button>
          {repo.isSeed && (
            <p className="mt-2.5 text-[0.75rem] text-[var(--nf-content-muted)]">
              Every sample stay is already on screen. Live inventory arrives with the
              platform API.
            </p>
          )}
        </Reveal>
      )}
    </>
  );
}
