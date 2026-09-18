import type { MetadataRoute } from "next";

import { syndicatable, type SyndicationSubject } from "./syndication";

/**
 * What the sitemap says, decided away from the route that serves it.
 *
 * The route (`app/sitemap.ts`) reads rows and hands them here. Everything that
 * decides WHICH rows deserve to be in a crawler's queue lives in this file, so
 * it can be run against a fixture in a unit test rather than only against a
 * live database, and so the rule stays next to the gate it obeys.
 *
 * The gate is `syndication.ts`. Nothing here re-states it.
 */

/** A listing, reduced to what a sitemap entry needs. */
export type SitemapListing = SyndicationSubject & {
  id: string;
  /** ISO timestamp of the last edit, when the row carries one. */
  updatedAt?: string | null;
};

/**
 * An accommodation on the Stays side, reduced the same way. It is its own
 * type rather than an alias because the two are read from different tables
 * and a caller passing one where the other belongs should not compile.
 */
export type SitemapStay = SyndicationSubject & {
  id: string;
  updatedAt?: string | null;
};

/**
 * The public, indexable pages that are not inventory.
 *
 * Everything here is open to a signed-out visitor: the same line `proxy.ts`
 * draws with `PRODUCT_SEGMENTS`, which is why a route under `home`, `saved`,
 * `wallet`, `trips`, `host` or either console appears nowhere below. A sitemap
 * entry that redirects to sign-in is a wasted crawl and a bad signal.
 *
 * Both sides are here. The Property side is `/search` and `/rent`; the Stays
 * side is `/stays`, its dated search and `/restaurants`, which the proxy
 * leaves open exactly as it leaves `/search` open.
 *
 * `/styleguide` is ours and carries noindex, so it is absent for the same
 * reason `proxy.ts` puts it behind the wall.
 *
 * Priority is left off deliberately. Google has said for years that it ignores
 * it, and a made-up ranking of our own pages is a claim we cannot support.
 */
export const PUBLIC_PAGES: readonly {
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
}[] = [
  { path: "/", changeFrequency: "daily" },
  { path: "/search", changeFrequency: "daily" },
  { path: "/rent", changeFrequency: "daily" },
  { path: "/stays", changeFrequency: "daily" },
  { path: "/stays/search", changeFrequency: "daily" },
  { path: "/restaurants", changeFrequency: "daily" },
  { path: "/around", changeFrequency: "weekly" },
  { path: "/about", changeFrequency: "monthly" },
  { path: "/help", changeFrequency: "monthly" },
  { path: "/docs", changeFrequency: "monthly" },
  { path: "/safety", changeFrequency: "monthly" },
  { path: "/standards", changeFrequency: "monthly" },
  { path: "/cancellations", changeFrequency: "monthly" },
  { path: "/contact", changeFrequency: "monthly" },
  { path: "/careers", changeFrequency: "monthly" },
  { path: "/terms", changeFrequency: "yearly" },
  { path: "/privacy", changeFrequency: "yearly" },
];

/**
 * Whether `/restaurant/[id]` pages belong in the sitemap.
 *
 * FALSE TODAY, AND ON PURPOSE. `app/(app)/restaurant/[id]/page.tsx` emits
 * `robots: { index: false }` for every restaurant it renders, and a URL that
 * a sitemap invites the crawler to and the page then turns away is the one
 * contradiction Search Console flags by name. The builder below knows how to
 * emit the entries, so the day that page starts indexing, this flips to true
 * and the route starts reading the rows. Flipping it here without the page
 * changing would publish a queue of URLs that all say "do not index me".
 */
export const RESTAURANT_PAGES_INDEXABLE = false;

/** What the route may hand the builder beyond the property listings. */
export type SitemapExtras = {
  /** Published accommodations, served at `/stay/[id]`. */
  stays?: readonly SitemapStay[];
  /** Published restaurant listings, served at `/restaurant/[id]`. */
  restaurants?: readonly SitemapListing[];
};

/**
 * The sitemap, from an origin and the rows.
 *
 * Every row is passed through the syndication gate here even though the read
 * that produced it already filtered in SQL. That is not belt and braces for
 * its own sake: the SQL predicate is one string in one file that a later
 * refactor can drop without any test noticing, and the consequence of dropping
 * it is a fabricated property advertisement in Google's index. The check that
 * cannot be refactored away is the one the type system forces every caller
 * through.
 */
export function buildSitemap(
  origin: string,
  listings: readonly SitemapListing[],
  extras: SitemapExtras = {},
): MetadataRoute.Sitemap {
  const base = origin.replace(/\/+$/, "");

  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    url: `${base}${page.path === "/" ? "" : page.path}` || base,
    changeFrequency: page.changeFrequency,
  }));

  const entry = (path: string, row: SitemapListing | SitemapStay) => ({
    url: `${base}${path}/${row.id}`,
    changeFrequency: "weekly" as const,
    ...(row.updatedAt ? { lastModified: new Date(row.updatedAt) } : {}),
  });

  const properties = syndicatable(listings).map((row) => entry("/listing", row));
  const stays = syndicatable(extras.stays ?? []).map((row) => entry("/stay", row));
  const restaurants = syndicatable(extras.restaurants ?? []).map((row) =>
    entry("/restaurant", row),
  );

  return [...pages, ...properties, ...stays, ...restaurants];
}
