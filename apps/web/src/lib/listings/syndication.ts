import type { Metadata } from "next";

import type { Listing } from "./types";
import type { ListingSearchFilter } from "./types";

/**
 * The one gate between a listing and a machine that will republish it.
 *
 * THE INCIDENT THIS PREVENTS, STATED PLAINLY. Forty two example listings are
 * in the catalogue because the catalogue is otherwise empty. They describe
 * properties that DO NOT EXIST. An example listing crawled by Google is a
 * fabricated property advertisement published under RentMe's name, with a
 * price and a location on it. Structured data makes that advertisement
 * eligible for a rich result with the price attached, and an Open Graph card
 * makes it a shareable advertisement in a WhatsApp thread. None of those
 * things can be taken back once they have happened.
 *
 * There are four surfaces that hand a listing to a machine: the sitemap, the
 * JSON-LD block, the Open Graph and Twitter card, and email. The temptation is
 * to write the same `if (listing.isDemo)` in all four. That is the shape that
 * fails, because the fifth surface is always the one nobody remembered, and
 * because four copies of a rule drift into four different rules. So all four
 * read through this file, and this file is the only place that decides.
 *
 * The same argument `email/recipients.ts` makes about notification settings:
 * a rule that has to be remembered at every send site is a rule that will be
 * forgotten at one of them.
 *
 * WHAT IS DELIBERATELY NOT HERE. Nothing in this file hides an example listing
 * from a person. They are meant to be browsable: somebody who lands on one
 * sees the page, reads the statement on it and understands what they are
 * looking at. The rule is about machines, and the distinction is the whole
 * design. A human reader gets the page. A crawler gets nothing it can index,
 * quote a price from, or turn into a card.
 */

/**
 * A listing, reduced to what this gate reads.
 *
 * Deliberately structural rather than the whole `Listing`, so a caller holding
 * a map pin (`MapPin`), a search row or anything else that carries the flag can
 * ask the same question without first building a full listing.
 */
export type SyndicationSubject = { isDemo: boolean };

/**
 * May this listing be handed to something that republishes it?
 *
 * One predicate, and every surface below is a consequence of it. Anything that
 * is not an example is real inventory listed by a real person, and belongs in
 * the sitemap, in structured data and on a shared card.
 */
export function maySyndicate(subject: SyndicationSubject): boolean {
  return !subject.isDemo;
}

/** The same rule over a collection, for a sitemap or a digest. */
export function syndicatable<T extends SyndicationSubject>(rows: readonly T[]): T[] {
  return rows.filter(maySyndicate);
}

/**
 * The filter every syndicating read must carry, applied LAST when merging.
 *
 * `excludeDemo` is pushed down to SQL against the partial `listings_demo_idx`,
 * so this keeps the example rows out of the result set rather than out of the
 * output, which matters the moment a read has a row cap on it: filtering after
 * the cap spends the whole budget on rows that are then discarded.
 *
 * Spread it after the caller's own filter, never before. A caller must not be
 * able to pass `excludeDemo: false` and win.
 */
export const SYNDICATION_FILTER: ListingSearchFilter = { excludeDemo: true };

/** The agreed sentence. "example" is the sanctioned word; see `types.ts`. */
export const EXAMPLE_STATEMENT =
  "This is an example listing. No such property is available. RentMe has not verified anything on this page.";

/**
 * Naira, as a schema.org decimal, from integer kobo.
 *
 * Money is integer kobo everywhere in this codebase and `price` in structured
 * data is a decimal string, so this is the one place the two meet. The
 * arithmetic is integer only: subtracting the remainder before dividing keeps
 * the numerator an exact multiple of 100, so no float rounding can reach the
 * figure a crawler quotes back to a reader.
 */
export function nairaDecimal(minorUnits: number): string {
  const kobo = Math.abs(minorUnits) % 100;
  const naira = (minorUnits - (minorUnits < 0 ? -kobo : kobo)) / 100;
  return `${naira}.${String(kobo).padStart(2, "0")}`;
}

/** The absolute URL of a listing on this deployment. */
export function listingUrl(listing: Pick<Listing, "id">, origin: string): string {
  return `${origin.replace(/\/+$/, "")}/listing/${listing.id}`;
}

/** What the price on this listing actually is, in kobo. */
function askingMinor(listing: Listing): number {
  if (listing.intent === "sale") return listing.salePriceMinor ?? 0;
  return listing.priceMinor;
}

/**
 * The whole structured data block for a listing detail page, or null.
 *
 * NULL IS THE POINT. An example listing gets no modified node, no node with a
 * caveat property on it and no node with the price removed. It gets nothing,
 * because every one of those alternatives is still a machine-readable claim
 * that a property exists at a place, and consumers of structured data are
 * under no obligation to read a caveat they were not expecting.
 *
 * The caller renders this only when it is not null, so a demo page emits no
 * script tag at all rather than an empty one.
 */
export function listingStructuredData(
  listing: Listing,
  origin: string,
): Record<string, unknown> | null {
  if (!maySyndicate(listing)) return null;

  const url = listingUrl(listing, origin);
  const minor = askingMinor(listing);

  const address: Record<string, unknown> = {
    "@type": "PostalAddress",
    addressLocality: listing.area || listing.city,
    addressRegion: listing.state,
    addressCountry: "NG",
  };

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    url,
    category: listing.kind,
    ...(listing.photos.length > 0 ? { image: listing.photos } : {}),
  };

  if (listing.lat !== undefined && listing.lng !== undefined) {
    node.geo = { "@type": "GeoCoordinates", latitude: listing.lat, longitude: listing.lng };
  }

  /*
   * A price of zero is "no amount was given", never "free", which is the rule
   * `matchesFacts` already applies to a budget search. Publishing an Offer at
   * zero naira would be a financial claim nobody made.
   */
  if (minor > 0) {
    node.offers = {
      "@type": "Offer",
      priceCurrency: listing.currency,
      price: nairaDecimal(minor),
      availability: "https://schema.org/InStock",
      url,
      // GoodRelations is the vocabulary schema.org itself points Offer at for
      // this distinction, and letting versus selling is not a detail: the same
      // figure means two completely different transactions.
      businessFunction:
        listing.intent === "sale"
          ? "http://purl.org/goodrelations/v1#Sell"
          : "http://purl.org/goodrelations/v1#LeaseOut",
      areaServed: { "@type": "Place", address },
    };
  }

  /*
   * A rating is emitted only when real reviews exist behind it. This platform
   * once shipped twenty three invented places with fabricated ratings, which
   * is the reason for every rule in this area, and a rich result carrying a
   * star count is the most durable form that mistake could take.
   */
  if (listing.reviewCount > 0 && listing.rating > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: listing.rating,
      reviewCount: listing.reviewCount,
    };
  }

  return node;
}

/**
 * A structured data node as the string that goes inside the script element.
 *
 * The escape is not decoration. A listing title, an area name and a photo URL
 * are all somebody else's text, and a title carrying a closing script tag would
 * end the block early and turn the rest of the JSON into markup.
 * The replacement is the JSON escape for the same character, so a reader parses
 * back exactly the node that went in and only the markup boundary is gone.
 */
export function structuredDataJson(node: Record<string, unknown>): string {
  return JSON.stringify(node).replace(/</g, "\\u003c");
}

/**
 * The page-level metadata for a listing: title, robots, Open Graph, Twitter.
 *
 * One function rather than four fields assembled at the page, so that the
 * robots directive and the social card can never disagree about what this row
 * is. A page that is noindex and still shares as a purchasable offer is the
 * worst of both: invisible to the crawler that would have been harmless, and
 * fully present in the channel Nigerians actually share property links in.
 *
 * `listing` may be null, which is the not-found case. The page calls
 * `notFound()` afterwards, and metadata is resolved first, so this has to
 * answer something.
 */
export function listingMetadata(listing: Listing | null, origin: string): Metadata {
  if (!listing) return { title: "Listing", robots: { index: false, follow: false } };

  const place =
    listing.area && listing.area !== listing.city
      ? `${listing.area}, ${listing.city}`
      : listing.city;

  if (!maySyndicate(listing)) {
    /*
     * The card an example listing shares as.
     *
     * It carries no property title, no place and no price. A card that named
     * the property would advertise it in every thread the link is pasted into,
     * which is the same fabricated advertisement the crawler rule exists to
     * prevent, only travelling by hand instead of by robot. The tab title
     * keeps the property name because that is a person reading their own open
     * tabs, and it is prefixed so it is honest there too.
     */
    return {
      title: `Example listing: ${listing.title}`,
      description: EXAMPLE_STATEMENT,
      robots: { index: false, follow: false },
      openGraph: {
        type: "website",
        title: "An example listing on RentMe",
        description: EXAMPLE_STATEMENT,
        url: listingUrl(listing, origin),
      },
      twitter: {
        card: "summary",
        title: "An example listing on RentMe",
        description: EXAMPLE_STATEMENT,
      },
    };
  }

  const minor = askingMinor(listing);
  const description =
    minor > 0
      ? `${listing.title} in ${place}. Listed on RentMe.`
      : `${listing.title} in ${place}. Listed on RentMe. Ask the lister for the price.`;
  const url = listingUrl(listing, origin);

  return {
    title: listing.title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: listing.title,
      description,
      url,
      ...(listing.photos.length > 0 ? { images: listing.photos.slice(0, 1) } : {}),
    },
    twitter: {
      card: listing.photos.length > 0 ? "summary_large_image" : "summary",
      title: listing.title,
      description,
      ...(listing.photos.length > 0 ? { images: listing.photos.slice(0, 1) } : {}),
    },
  };
}
