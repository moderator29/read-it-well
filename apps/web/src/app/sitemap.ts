import type { MetadataRoute } from "next";

import { buildSitemap } from "@/lib/listings/sitemap";
import { areaPricePages } from "@/lib/areas/queries";
import { siteUrl } from "@/lib/site";

/**
 * `/sitemap.xml`.
 *
 * IT READS NO DATABASE AT ALL NOW, AND THAT IS THE POINT.
 *
 * Until 23 September this route walked `listings` and `accommodations` in
 * pages, refused the example rows twice over, and emitted a URL per published
 * property. The founder's item 8 then closed the platform: every one of those
 * addresses sends a signed-out visitor to `/sign-in` before the page runs, and
 * a crawler is a signed-out visitor. Advertising pages a crawler is then
 * refused at is worse than advertising nothing, so the route stopped
 * advertising them.
 *
 * WHAT WENT WITH IT, SAID PLAINLY SO NOBODY LOOKS FOR IT: the cookie-free
 * `anon` client, the paged walk with its twenty-thousand-row ceiling, and the
 * second refusal of the example listings on the way out. None of that was
 * wrong. It has no rows to run over, because there is no public inventory
 * surface left for a row to point at.
 *
 * The rule it obeyed is untouched and still governs the other three surfaces:
 * `lib/listings/syndication.ts` decides the JSON-LD block, the Open Graph card
 * and email. Putting inventory back here means reopening the gate first; see
 * `lib/listings/sitemap.ts`.
 *
 * `robots.txt` is written from the same decision, and
 * `app/sitemap.test.ts` holds this file, `robots.ts` and `proxy.ts` to the
 * same answer so the three cannot drift.
 */
/*
 * ONE READ CAME BACK, AND IT IS NOT INVENTORY (V-82). The public area price
 * pages are aggregates (what an area is asking, with the count), and an area
 * earns one only with the Price Check minimum of REAL listings. The list is
 * read as a cookie-less stranger through `areaPricePages`, so the sitemap
 * names exactly the pages a crawler will be served, and none today. An
 * outage lists none rather than failing the whole file.
 */
/* Built at most once a day. The area list grows with real supply, which is
   measured in weeks; a crawler does not need it fresher than that, and a
   sitemap regenerated per request is a database read per crawler hit. */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await areaPricePages();
  return buildSitemap(
    siteUrl(),
    (pages ?? []).map((page) => ({ path: page.path, lastModified: page.newestAt })),
  );
}
