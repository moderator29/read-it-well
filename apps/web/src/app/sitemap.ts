import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { buildSitemap, type SitemapListing } from "@/lib/listings/sitemap";
import { siteUrl } from "@/lib/site";

/**
 * `/sitemap.xml`, which until now did not exist.
 *
 * THE RULE THIS ROUTE EXISTS TO OBEY. Forty two example listings are in the
 * catalogue, they describe properties that DO NOT EXIST, and a sitemap is an
 * explicit invitation to a crawler. Handing Google the address of a fabricated
 * property advertisement published under our name is the single worst thing
 * this file could do, so the exclusion is not a filter written here: it is
 * `SYNDICATION_FILTER` pushed into SQL, and then the gate applied again inside
 * `buildSitemap`. See `lib/listings/syndication.ts` for why both.
 *
 * WHY THE READ IS HERE RATHER THAN THROUGH `ListingRepository`. The repository
 * caps a catalogue read at sixty rows, deliberately, because it is serving a
 * page. A sitemap that silently stopped at sixty would be the same defect the
 * catalogue search had before BE-3: correct-looking today at forty two rows,
 * quietly wrong on the day the catalogue grows, which is the day it matters.
 * So this reads the two columns a sitemap needs, in pages, until the table is
 * exhausted, and it never asks for the fifty columns a listing card needs.
 *
 * `/u/[handle]` and `/post/[id]` are public and are deliberately absent. Both
 * are somebody's own content rather than inventory, both need their own
 * enumeration and their own opt-out, and neither is what a property
 * marketplace is found for. Naming that here so their absence reads as a
 * decision rather than as an oversight.
 */

/** One page of the enumeration. Two columns, so the pages can be wide. */
const PAGE_SIZE = 1000;

/**
 * The row ceiling for the whole sitemap.
 *
 * A sitemap file may hold fifty thousand URLs by the protocol, and this stops
 * well short of it. When the catalogue reaches this size the answer is
 * `generateSitemaps` and a sitemap index, not a bigger number here: the point
 * of the ceiling is that the route cannot pull an unbounded table into memory
 * on a cold request.
 */
const MAX_URLS = 20_000;

async function publishedListings(): Promise<SitemapListing[]> {
  try {
    const supabase = await createClient();
    const rows: SitemapListing[] = [];

    for (let from = 0; from < MAX_URLS; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("listings")
        .select("id, is_demo, updated_at")
        .eq("status", "PUBLISHED")
        /* The example rows are refused in SQL so they never leave the
           database. `listings_demo_idx` is partial on `is_demo = true`, so
           this is answered from the small side of the table. `buildSitemap`
           applies the gate a second time over whatever comes back. */
        .eq("is_demo", false)
        .order("updated_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data || data.length === 0) break;

      for (const row of data) {
        rows.push({ id: row.id, isDemo: row.is_demo, updatedAt: row.updated_at });
      }
      if (data.length < PAGE_SIZE) break;
    }

    return rows;
  } catch {
    /*
     * An unreachable database yields the static pages alone rather than a 500.
     * A sitemap that errors is dropped wholesale by the crawler that fetched
     * it; a sitemap that is briefly short of its listings is re-read tomorrow.
     */
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(siteUrl(), await publishedListings());
}
