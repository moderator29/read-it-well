import type { PublicPageKey } from "@vallo/i18n";

/**
 * THE SITE'S OWN CARD, FOR A PAGE THAT HAS NONE (W3, round 5).
 *
 * Next resolves Open Graph per segment, and a page that sets `openGraph`
 * REPLACES the layout's whole object, image included; the image file beside
 * the root layout is merged only at the root. So every public page that wrote
 * its own Open Graph words and had no `opengraph-image` of its own unfurled
 * with NO picture at all: /terms, /privacy, /docs, /contact, /sign-in (which is
 * also what every signed-out link to a closed page lands on) and the invite
 * door /join, the one link the referral programme asks members to post.
 *
 * Those pages name this card. It is the root file at its public path
 * (`proxy.ts` serves it signed out), so there is still only one picture.
 */
export const SITE_CARD = {
  url: "/opengraph-image.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "Vallo. Space, without the runaround.",
} as const;

/**
 * The public pages that draw their own card (an `opengraph-image` beside the
 * page). They must NOT name `SITE_CARD`: an `images` key on the page's Open
 * Graph would win over its own file. `site-card.test.ts` holds this list to
 * the files on disk.
 */
export const OWN_CARD: ReadonlySet<PublicPageKey> = new Set<PublicPageKey>([
  "about",
  "help",
  "safety",
  "standards",
  "receiptCheck",
]);
