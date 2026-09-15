import { describe, expect, it } from "vitest";

import {
  EXAMPLE_STATEMENT,
  listingMetadata,
  listingStructuredData,
  listingUrl,
  maySyndicate,
  nairaDecimal,
  structuredDataJson,
  SYNDICATION_FILTER,
  syndicatable,
} from "./syndication";
import type { Listing } from "./types";

/**
 * The gate, held to the one promise it makes: an example listing reaches no
 * machine that will republish it.
 *
 * The four surfaces have their own specs beside this one. This file tests the
 * gate itself, because the gate is what those four delegate to, and a spec per
 * surface that did not agree on what "excluded" means would be four specs
 * proving four different things.
 */

const ORIGIN = "https://vallo.ng";

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: "0d4b1f0a-1111-4222-8333-444455556666",
    slug: "two-bedroom-flat-in-yaba",
    title: "Two bedroom flat in Yaba",
    kind: "rental",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 220_000_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 1,
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

const example = (over: Partial<Listing> = {}) => listing({ isDemo: true, ...over });

describe("the gate", () => {
  it("lets a real listing through and stops an example one", () => {
    expect(maySyndicate(listing())).toBe(true);
    expect(maySyndicate(example())).toBe(false);
  });

  it("keeps a mixed set down to the real rows", () => {
    const rows = [listing({ id: "a" }), example({ id: "b" }), listing({ id: "c" })];
    expect(syndicatable(rows).map((r) => r.id)).toEqual(["a", "c"]);
  });

  /**
   * The one thing a caller must not be able to do is ask for the examples
   * back. `SYNDICATION_FILTER` is documented as spread last, and this is what
   * makes that documentation load-bearing.
   */
  it("cannot be turned off by a caller's own filter", () => {
    const merged = { ...{ excludeDemo: false, kind: "rental" as const }, ...SYNDICATION_FILTER };
    expect(merged.excludeDemo).toBe(true);
  });
});

describe("structured data", () => {
  it("emits nothing at all for an example listing", () => {
    expect(listingStructuredData(example(), ORIGIN)).toBeNull();
  });

  /**
   * Stated as a property of the JSON rather than of the return value, because
   * "no Product, no Offer, no Residence" is the actual requirement and a null
   * check alone would still pass if a later change returned some other node.
   */
  it("emits no Product, Offer or Residence node for an example listing", () => {
    const node = listingStructuredData(
      example({ rating: 4.8, reviewCount: 21, priceMinor: 500_000_000 }),
      ORIGIN,
    );
    const serialised = node === null ? "" : JSON.stringify(node);
    expect(serialised).not.toMatch(/Product|Offer|Residence|AggregateRating/);
    expect(serialised).toBe("");
  });

  it("emits a priced Offer for a real listing", () => {
    const node = listingStructuredData(listing(), ORIGIN);
    expect(node).not.toBeNull();
    expect(node?.["@type"]).toBe("Product");
    expect(node?.offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "NGN",
      price: "2200000.00",
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
    });
  });

  it("says selling rather than letting on a sale listing", () => {
    const node = listingStructuredData(
      listing({ intent: "sale", salePriceMinor: 18_000_000_000 }),
      ORIGIN,
    );
    expect(node?.offers).toMatchObject({
      price: "180000000.00",
      businessFunction: "http://purl.org/goodrelations/v1#Sell",
    });
  });

  /**
   * A price of zero is "no amount was given", which is the rule the budget
   * filter already applies. Publishing an Offer at zero naira would be a
   * financial claim nobody made.
   */
  it("emits no Offer when the listing states no price", () => {
    const node = listingStructuredData(listing({ priceMinor: 0 }), ORIGIN);
    expect(node).not.toBeNull();
    expect(node?.offers).toBeUndefined();
  });

  /**
   * The whole reason this section of the product has rules: this repository
   * once shipped twenty three invented places with fabricated ratings.
   */
  it("emits no rating unless real reviews stand behind it", () => {
    expect(listingStructuredData(listing({ rating: 4.9, reviewCount: 0 }), ORIGIN)?.aggregateRating)
      .toBeUndefined();
    expect(
      listingStructuredData(listing({ rating: 4.9, reviewCount: 12 }), ORIGIN)?.aggregateRating,
    ).toMatchObject({ ratingValue: 4.9, reviewCount: 12 });
  });

  it("cannot be ended early by a title carrying markup", () => {
    const node = listingStructuredData(listing({ title: "Flat </script><img> in Yaba" }), ORIGIN);
    const json = structuredDataJson(node ?? {});
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).name).toBe("Flat </script><img> in Yaba");
  });
});

describe("kobo to a schema.org price", () => {
  it("keeps the kobo and never reaches for a float", () => {
    expect(nairaDecimal(220_000_000)).toBe("2200000.00");
    expect(nairaDecimal(1)).toBe("0.01");
    expect(nairaDecimal(99)).toBe("0.99");
    expect(nairaDecimal(100)).toBe("1.00");
    expect(nairaDecimal(450_050)).toBe("4500.50");
    expect(nairaDecimal(0)).toBe("0.00");
  });
});

describe("the social card and the robots directive", () => {
  it("noindexes an example listing and follows nothing from it", () => {
    expect(listingMetadata(example(), ORIGIN).robots).toEqual({ index: false, follow: false });
  });

  it("indexes a real listing, which is what a marketplace is for", () => {
    expect(listingMetadata(listing(), ORIGIN).robots).toEqual({ index: true, follow: true });
  });

  /**
   * A card naming the property advertises it in every thread the link is
   * pasted into. That is the same fabricated advertisement the crawler rule
   * exists to stop, travelling by hand instead of by robot.
   */
  it("never names the property, the place or the price on an example card", () => {
    const meta = listingMetadata(example({ title: "Sea view duplex" }), ORIGIN);
    const card = JSON.stringify([meta.openGraph, meta.twitter]);

    expect(card).not.toContain("Sea view duplex");
    expect(card).not.toContain("Yaba");
    expect(card).not.toContain("2200000");
    expect(meta.openGraph?.description).toBe(EXAMPLE_STATEMENT);
    /* Never "product". An og:type of product is a machine-readable claim that
       the thing on the page can be bought, which is the one claim an example
       listing may not make. */
    expect(card).toContain('"type":"website"');
  });

  it("offers no canonical for an example listing", () => {
    expect(listingMetadata(example(), ORIGIN).alternates).toBeUndefined();
    expect(listingMetadata(listing(), ORIGIN).alternates?.canonical).toBe(
      listingUrl(listing(), ORIGIN),
    );
  });

  /**
   * The tab title keeps the property name, because that is a person reading
   * their own open tabs rather than a machine reading a claim. It is prefixed
   * so it is honest there too, in the sanctioned word.
   */
  it("labels the tab as an example without using a banned word", () => {
    const title = String(listingMetadata(example(), ORIGIN).title);
    expect(title).toContain("Example listing");
    expect(title).not.toMatch(/\b(demo|sample|preview|not live)\b/i);
    expect(EXAMPLE_STATEMENT).not.toMatch(/\b(demo|sample|preview|not live)\b/i);
  });

  it("answers something for a listing that does not exist", () => {
    expect(listingMetadata(null, ORIGIN).robots).toEqual({ index: false, follow: false });
  });
});
