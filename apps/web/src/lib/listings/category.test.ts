import { describe, expect, it } from "vitest";

import { factsOf, matchesFacts, matchesFilter } from "./filter";
import {
  KIND_NOUN,
  KIND_ORDER,
  kindLabel,
  toPoolFilter,
  type DiscoveryQuery,
} from "./search-params";
import type { Listing, ListingKind } from "./types";

/**
 * The category, after it stopped being navigation and became a filter.
 *
 * The rail above the search results was the platform's last sub-navigation and
 * the only category control there was, so it could not be removed until the
 * filter drawer could do the job. Three things had to hold before it went, and
 * none of them was true beforehand:
 *
 *   1. The BROWSER matcher has to answer the category. The drawer's live match
 *      count runs on `ListingFacts` alone, in the browser, and the facts did
 *      not carry `kind` at all. A control whose count silently ignored it would
 *      have promised a number and then applied a filter returning a different
 *      one, on the single number a person trusts on that screen.
 *   2. The POOL has to span every category. It was read with the address bar's
 *      category already applied, which is safe while nothing in the drawer can
 *      ask about another one and wrong the moment something can.
 *   3. The order the markets are offered in has to survive the deletion of the
 *      component that used to hold it.
 *
 * These are the tests for those three, and they are written against the same
 * functions the server runs, because that shared definition is the whole reason
 * the count can be trusted.
 */

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: "1",
    slug: "a",
    title: "Two bedroom flat in Yaba",
    kind: "apartment",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 220_000_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 1,
    rating: 0,
    reviewCount: 0,
    verified: true,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

function query(over: Partial<DiscoveryQuery> = {}): DiscoveryQuery {
  return {
    sort: "recommended",
    view: "list",
    amenities: [],
    instantBook: false,
    verifiedOnly: false,
    powerBackup: false,
    powerBandA: false,
    waterSupply: [],
    ...over,
  };
}

describe("the facts handed to the browser carry the category", () => {
  it("travels, so the drawer can count it", () => {
    expect(factsOf(listing({ kind: "shortlet" })).kind).toBe("shortlet");
  });

  /**
   * The count on the Apply button is `facts.filter(matchesFacts).length`. If
   * this predicate ignored the category the button would report the count for
   * whatever the address bar already said while the reader looked at a market
   * they had just picked.
   */
  it("narrows a facts match exactly as the server narrows a listing match", () => {
    const hotel = factsOf(listing({ kind: "hotel" }));
    const shortlet = factsOf(listing({ kind: "shortlet" }));

    expect(matchesFacts(hotel, { kind: "hotel" })).toBe(true);
    expect(matchesFacts(shortlet, { kind: "hotel" })).toBe(false);
  });

  it("lets everything through when no category was asked for", () => {
    for (const kind of KIND_ORDER) {
      expect(matchesFacts(factsOf(listing({ kind })), {})).toBe(true);
    }
  });

  /**
   * One definition, not two. `matchesFilter` used to test the category itself
   * and then hand the same row to `matchesFacts`, so there were two places the
   * rule could be changed and only one of them ran in the browser.
   */
  it("gives the server and the browser the same answer for every market", () => {
    for (const kind of KIND_ORDER) {
      const row = listing({ kind });
      for (const asked of KIND_ORDER) {
        expect(matchesFilter(row, { kind: asked })).toBe(matchesFacts(factsOf(row), { kind: asked }));
      }
    }
  });
});

describe("the pool the drawer counts against", () => {
  /**
   * The incident this prevents: a reader on `/search?type=hotel` opens filters,
   * picks Shortlets, and the button reads "No places match yet" because the
   * pool it is counting was fetched with `kind: "hotel"` already applied. Every
   * shortlet in the catalogue would have been invisible to the count and then
   * present in the results.
   */
  it("keeps the text and drops the category", () => {
    const filter = toPoolFilter(query({ q: "Yaba", kind: "hotel" }));
    expect(filter.q).toBe("Yaba");
    expect(filter.kind).toBeUndefined();
  });

  it("is the whole catalogue when nothing was typed", () => {
    expect(toPoolFilter(query({ kind: "land" }))).toEqual({});
  });
});

describe("the order the markets are offered in", () => {
  it("names every market exactly once", () => {
    const nouns = Object.keys(KIND_NOUN) as ListingKind[];
    expect([...KIND_ORDER].sort()).toEqual([...nouns].sort());
    expect(new Set(KIND_ORDER).size).toBe(KIND_ORDER.length);
  });

  it("reads a category the way a person would write it", () => {
    expect(kindLabel("hotel")).toBe("Hotels");
    expect(kindLabel("land")).toBe("Plots");
  });
});
