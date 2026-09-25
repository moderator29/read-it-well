import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * `/robots.txt`.
 *
 * ===========================================================================
 * IT SAYS THE OPPOSITE OF WHAT IT SAID YESTERDAY, AND THAT IS ITEM 8
 * ===========================================================================
 *
 * This file used to draw the same line `proxy.ts` drew: browsing open, doing
 * behind an account. The founder closed the platform on 23 September, so the
 * line moved and this moved with it. Everything except the landing page, the
 * company and support pages, and the legal set is now behind the gate, and a
 * crawler is a signed-out visitor.
 *
 * The disallow list below is therefore not a security control and never was.
 * Every route named here is protected by the proxy and by RLS behind it. What
 * it buys is a crawler not spending our budget on a queue of URLs that all
 * answer 307 to `/sign-in`, which Search Console reports row by row as "Page
 * with redirect". Listing a path here also publishes the path, which is why
 * nothing secret is named.
 *
 * WHY THE LIST IS SHORT RATHER THAN EXHAUSTIVE. `Allow: /` plus the closed
 * trees is the readable statement of a rule whose real enforcement is one
 * function in `proxy.ts`. Enumerating all fifty-odd gated segments here would
 * be a second copy of that rule, drifting from the first the day somebody adds
 * a route. `app/sitemap.test.ts` holds this file, the sitemap and
 * `isPublicPath` to the same answer for the paths that are named.
 *
 * THE EXAMPLE LISTINGS ARE NOT KEPT OUT BY THIS FILE, and they never were.
 * They live under `/listing/[id]` alongside real inventory, so no path pattern
 * could separate them. They are kept out by the noindex their own page emits
 * and, now, by the gate in front of it.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl().replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        /* `/areas/` is named although `/` already allows it, so the one
           public inventory-shaped surface (V-82: aggregates, never a listing)
           is visibly a decision rather than an accident. `/s/` (the share
           door, V-07) is deliberately in NEITHER list: doors carry
           `noindex` in their own metadata, and several link unfurlers honour
           robots.txt, so disallowing the door would make every shared card
           unfurl as nothing. */
        allow: ["/", "/areas/"],
        disallow: [
          /* The consoles and the data routes. */
          "/admin/",
          "/agent/",
          "/api/",
          "/auth/",
          /* The browsing surfaces, closed by item 8. Both sides of the
             platform, drawn the same way: what was open on the Property side
             (`/search`, `/listing/`, `/rent`, `/around/`, `/price`) and on the
             Stays side (`/stays`, `/stay/`, `/restaurants`, `/restaurant/`)
             is closed on both. */
          "/around/",
          "/listing/",
          "/price",
          "/rent",
          "/restaurant/",
          "/restaurants",
          "/search",
          "/stay/",
          "/stays",
          /* Somebody's own content, which was public and is not now. */
          "/post/",
          "/stories/",
          "/u/",
          /* Somebody's own data, their money, and the things they do. */
          "/agreements",
          "/assistant",
          "/bookings/",
          "/checkout/",
          "/escrow",
          "/home",
          "/host/",
          "/inspections/",
          "/legal/",
          "/messages/",
          "/notifications/",
          "/profile/",
          "/saved",
          "/settings/",
          "/trips/",
          "/verification/",
          "/wallet",
          /* The in-product first run. The public door is `/` and the auth
             screens carry their own noindex. */
          "/welcome",
          /* Ours, not a visitor's. */
          "/styleguide",
          /* The dev-only harnesses. They answer not-found in production, and
             a 404 in a crawl queue is still a wasted fetch with our name on
             it. */
          "/gallery/",
          "/preview/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
