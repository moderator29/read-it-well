import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * `/robots.txt`.
 *
 * `admin/social/page.tsx` has carried the comment "belt and braces alongside
 * robots.ts" since before this file existed, which is exactly the kind of gap
 * a comment cannot close on its own. It exists now.
 *
 * The disallow list is the same line `middleware.ts` draws with
 * `PRODUCT_SEGMENTS`: browsing is open and doing costs an account. Everything
 * below either holds somebody's own data, holds money, or is a console, so a
 * crawl of it is at best wasted and at worst a queue of URLs that all redirect
 * to sign-in.
 *
 * This is a crawl instruction and NOT a privacy control. Every route named
 * here is protected by the middleware and by RLS behind it. A file that asks
 * politely is not what keeps anybody's wallet private, and listing a path here
 * publishes the path, which is why nothing secret is named.
 *
 * THE EXAMPLE LISTINGS ARE NOT KEPT OUT BY THIS FILE. They live under
 * `/listing/[id]` alongside real inventory, so no path pattern could separate
 * them. They are kept out by being absent from the sitemap and by the noindex
 * their own page emits, both decided at one gate in
 * `lib/listings/syndication.ts`.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl().replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/agent/",
          "/api/",
          "/auth/",
          "/bookings/",
          "/checkout/",
          "/home",
          "/legal/",
          "/messages/",
          "/notifications/",
          "/profile/",
          "/saved",
          "/settings/",
          "/stories/",
          "/styleguide",
          "/wallet",
          "/welcome",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
