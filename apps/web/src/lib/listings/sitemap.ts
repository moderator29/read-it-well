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
 * The public, indexable pages that are not listings.
 *
 * Everything here is open to a signed-out visitor: the same line
 * `middleware.ts` draws with `PRODUCT_SEGMENTS`, which is why a route under
 * `home`, `saved`, `wallet` or either console appears nowhere below. A sitemap
 * entry that redirects to sign-in is a wasted crawl and a bad signal.
 *
 * `/styleguide` is ours and carries noindex, so it is absent for the same
 * reason `middleware.ts` puts it behind the wall.
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
 * The sitemap, from an origin and a set of rows.
 *
 * The listings are passed through the syndication gate here even though the
 * read that produced them already filtered in SQL. That is not belt and braces
 * for its own sake: the SQL predicate is one string in one file that a later
 * refactor can drop without any test noticing, and the consequence of dropping
 * it is a fabricated property advertisement in Google's index. The check that
 * cannot be refactored away is the one the type system forces every caller
 * through.
 */
export function buildSitemap(
  origin: string,
  listings: readonly SitemapListing[],
): MetadataRoute.Sitemap {
  const base = origin.replace(/\/+$/, "");

  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    url: `${base}${page.path === "/" ? "" : page.path}` || base,
    changeFrequency: page.changeFrequency,
  }));

  const properties: MetadataRoute.Sitemap = syndicatable(listings).map((listing) => ({
    url: `${base}/listing/${listing.id}`,
    changeFrequency: "weekly" as const,
    ...(listing.updatedAt ? { lastModified: new Date(listing.updatedAt) } : {}),
  }));

  return [...pages, ...properties];
}
