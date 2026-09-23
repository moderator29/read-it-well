import type { MetadataRoute } from "next";

/**
 * What the sitemap says, decided away from the route that serves it.
 *
 * ===========================================================================
 * WHAT CHANGED ON 23 SEPTEMBER, AND IT IS NOT A TIDY-UP
 * ===========================================================================
 *
 * This file used to take the published catalogue and emit a URL per listing,
 * per accommodation and, behind a flag, per restaurant. It does not any more,
 * because there is nothing left for a crawler to fetch.
 *
 * The founder's item 8 closed the platform: `/listing/[id]`, `/search`,
 * `/stay/[id]`, `/around` and the rest now send a signed-out visitor to
 * `/sign-in` before the page runs. Googlebot is a signed-out visitor. A
 * sitemap that kept naming those addresses would be a list of URLs that every
 * crawler is then refused at, which is a WORSE signal than no sitemap at all:
 * Search Console reports it as "Page with redirect" for every row, and the
 * one honest public surface we do have is buried under a queue of bounces.
 *
 * The founder accepted this consequence by name: "No listing will be indexed
 * by Google, so the landing page becomes our only public surface." It is
 * written up in `docs/STORE_SUBMISSION_NOTES.md` so nobody later reports the
 * empty catalogue in the sitemap as a regression and "fixes" it.
 *
 * THE SYNDICATION GATE IS NOT GONE AND MUST NOT BE REMOVED.
 * `lib/listings/syndication.ts` still governs the JSON-LD block, the Open
 * Graph card and email, which are the three remaining ways a listing reaches
 * a machine. This file simply no longer has rows to pass through it.
 *
 * WHAT WOULD HAVE TO HAPPEN TO PUT INVENTORY BACK. The gate would have to
 * reopen `listing` in `proxy.ts` first. Restoring the rows here without that
 * would publish the same queue of refusals. The order matters and it is
 * written down rather than left to be worked out again.
 */

/**
 * The public, indexable pages, and they are now the whole sitemap.
 *
 * Every path here is one `isPublicPath` in `src/proxy.ts` allows, and
 * `app/sitemap.test.ts` asserts exactly that against the live rule rather than
 * against a copy of it. A sitemap entry that redirects to sign-in is a wasted
 * crawl and a bad signal, and after item 8 that is true of almost every
 * address on this platform.
 *
 * `/delete-account` is here deliberately. It is the page Google Play requires
 * to be publicly reachable, and a page a store reviewer must be able to FIND
 * as well as open.
 *
 * `/offline`, the auth screens and `/welcome` are public and are deliberately
 * absent: they are public because a person needs them, not because a crawler
 * does, and each of them carries its own noindex.
 *
 * `/styleguide` is ours, carries noindex, and is behind the gate.
 *
 * Priority is left off deliberately. Google has said for years that it ignores
 * it, and a made-up ranking of our own pages is a claim we cannot support.
 */
export const PUBLIC_PAGES: readonly {
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
}[] = [
  { path: "/", changeFrequency: "daily" },
  { path: "/about", changeFrequency: "monthly" },
  { path: "/help", changeFrequency: "monthly" },
  { path: "/docs", changeFrequency: "monthly" },
  { path: "/safety", changeFrequency: "monthly" },
  { path: "/standards", changeFrequency: "monthly" },
  { path: "/cancellations", changeFrequency: "monthly" },
  { path: "/contact", changeFrequency: "monthly" },
  { path: "/careers", changeFrequency: "monthly" },
  { path: "/delete-account", changeFrequency: "yearly" },
  { path: "/eula", changeFrequency: "yearly" },
  { path: "/terms", changeFrequency: "yearly" },
  { path: "/privacy", changeFrequency: "yearly" },
];

/**
 * The sitemap, from an origin and nothing else.
 *
 * It takes no rows, and that is the signature doing the work: a function that
 * accepted a catalogue and quietly dropped it would be a lie generator, and
 * the next person to hold this file would reasonably assume the rows were
 * being published.
 */
export function buildSitemap(origin: string): MetadataRoute.Sitemap {
  const base = origin.replace(/\/+$/, "");
  return PUBLIC_PAGES.map((page) => ({
    url: `${base}${page.path === "/" ? "" : page.path}` || base,
    changeFrequency: page.changeFrequency,
  }));
}
