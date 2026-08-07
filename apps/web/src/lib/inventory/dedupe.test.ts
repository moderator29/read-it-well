import { describe, expect, it } from "vitest";
import { dedupeListings, distanceMetres, namesMatch, sameProperty } from "./dedupe";
import type { Listing, ListingKind } from "../listings/types";

/**
 * De-duplication, which decides what a visitor never sees.
 *
 * Two failures are possible here and they are not equally bad, so they are not
 * tested to the same standard.
 *
 * A MISSED duplicate shows one hotel twice. Untidy, self-evident to anybody
 * looking at the page, and reported in an afternoon.
 *
 * A WRONG merge deletes a listing from the results. If the record that survives
 * is a partner card, a real agent's verified property has been replaced by
 * somebody else's description of a different building, and nothing anywhere
 * says so: the agent sees their listing published, the search page simply does
 * not contain it. That is the fault this file exists to catch, which is why
 * most of what follows is about pairs that must NOT merge.
 */

function listing(over: Partial<Listing> & { id: string; title: string }): Listing {
  return {
    slug: over.id,
    kind: "hotel" as ListingKind,
    area: "Victoria Island",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 0,
    currency: "NGN",
    bedrooms: 0,
    bathrooms: 0,
    rating: 0,
    reviewCount: 0,
    verified: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

/** First party, as the Supabase repository builds it. */
function ours(over: Partial<Listing> & { id: string; title: string }): Listing {
  return listing({ source: "rentme", verified: true, ...over });
}

/** A Google Places card: real venue, no price, nothing bookable. */
function fromPlaces(over: Partial<Listing> & { id: string; title: string }): Listing {
  return listing({
    source: "partner",
    partner: { provider: "places", attribution: "Google" },
    priceMinor: 0,
    ...over,
  });
}

/** A LiteAPI card: same venue, carries a real naira rate. */
function fromLiteapi(over: Partial<Listing> & { id: string; title: string }): Listing {
  return listing({
    source: "partner",
    partner: { provider: "liteapi" },
    priceMinor: 18_500_000,
    ...over,
  });
}

describe("distance", () => {
  it("measures a known Lagos separation", () => {
    // Eko Hotel (VI) to the Lekki Phase 1 gate, about 4.5km apart.
    const metres = distanceMetres({ lat: 6.4281, lng: 3.4219 }, { lat: 6.4474, lng: 3.4553 });
    expect(metres).toBeGreaterThan(3_500);
    expect(metres).toBeLessThan(5_500);
  });

  it("is zero for the same point and symmetric", () => {
    const a = { lat: 9.0765, lng: 7.3986 };
    const b = { lat: 9.0771, lng: 7.399 };
    expect(distanceMetres(a, a)).toBe(0);
    expect(distanceMetres(a, b)).toBeCloseTo(distanceMetres(b, a), 6);
  });
});

describe("names", () => {
  /*
   * The three pairs the old exact-string rule missed. Each is one real
   * building described by two feeds.
   */
  it("sees through the spellings two feeds actually use", () => {
    expect(namesMatch("Eko Hotel & Suites", "Eko Hotels and Suites")).toBe(true);
    expect(namesMatch("The George, Ikoyi", "The George Lagos")).toBe(true);
    expect(namesMatch("Transcorp Hilton Abuja", "Transcorp Hilton")).toBe(true);
  });

  it("folds diacritics, which feeds carry inconsistently", () => {
    expect(namesMatch("Ìtàn Test Kitchen", "Itan Test Kitchen")).toBe(true);
  });

  it("refuses two properties that merely share a category noun", () => {
    // Everything both names have in common is stripped as generic, so there is
    // no distinctive evidence and no match.
    expect(namesMatch("Lagos Continental Hotel", "Radisson Blu Hotel")).toBe(false);
    expect(namesMatch("Bogobiri Guest House", "Maryland Guest House")).toBe(false);
  });

  it("will not let a short abbreviation carry a match on its own", () => {
    // One shared token below MIN_SOLO_TOKEN. "VI" is half of Lagos.
    expect(namesMatch("VI Suites", "VI Apartments")).toBe(false);
  });

  it("still matches when both names are nothing but category nouns", () => {
    // No distinctive tokens on either side, so it falls back to the whole
    // normalised string rather than declaring a match on two empty sets.
    expect(namesMatch("The Guest House", "The Guest House")).toBe(true);
    expect(namesMatch("The Guest House", "The Lodge")).toBe(false);
  });
});

describe("the same place", () => {
  it("merges one hotel described by two feeds a few metres apart", () => {
    const a = fromPlaces({ id: "p1", title: "Eko Hotel & Suites", lat: 6.4281, lng: 3.4219 });
    const b = fromLiteapi({ id: "l1", title: "Eko Hotels and Suites", lat: 6.4283, lng: 3.4222 });
    expect(sameProperty(a, b)).toBe(true);
  });

  it("keeps two properties apart when only the name agrees", () => {
    // The real trap: Bogobiri House is in Ikoyi, and there is another in
    // Calabar. Name-only matching merges them and one city loses its listing.
    const ikoyi = ours({ id: "a", title: "Bogobiri House", lat: 6.4474, lng: 3.4344 });
    const calabar = fromPlaces({
      id: "b",
      title: "Bogobiri House",
      city: "Calabar",
      state: "Cross River",
      lat: 4.9757,
      lng: 8.3417,
    });
    expect(sameProperty(ikoyi, calabar)).toBe(false);
  });

  it("keeps two properties apart when only the location agrees", () => {
    // Next door to each other, genuinely different hosts and buildings.
    const a = ours({ id: "a", title: "Maison Fahrenheit", lat: 6.4281, lng: 3.4219 });
    const b = fromPlaces({ id: "b", title: "Radisson Blu Anchorage", lat: 6.4282, lng: 3.422 });
    expect(sameProperty(a, b)).toBe(false);
  });

  it("does not merge a hotel with the restaurant inside it", () => {
    // Same doorway, same distinctive word, entirely different product. Merging
    // these would offer a table for two to somebody who wanted a bed.
    const hotel = fromLiteapi({ id: "h", title: "Eko Hotel", lat: 6.4281, lng: 3.4219 });
    const restaurant = fromPlaces({
      id: "r",
      title: "Eko Kitchen",
      kind: "restaurant",
      lat: 6.4281,
      lng: 3.4219,
    });
    expect(sameProperty(hotel, restaurant)).toBe(false);
  });

  it("compares a shortlet with a hotel, because two feeds file one building differently", () => {
    // An agent lists a serviced flat as a shortlet; Google returns the same
    // address as lodging and it maps to hotel. This is the commonest real
    // duplicate on the platform, and blocking on the exact kind would miss it.
    const flat = ours({ id: "a", title: "Eden Heights", kind: "shortlet", lat: 6.4281, lng: 3.4219 });
    const same = fromPlaces({ id: "b", title: "Eden Heights", kind: "hotel", lat: 6.4283, lng: 3.4221 });
    expect(sameProperty(flat, same)).toBe(true);
  });

  it("never merges a yearly tenancy with a nightly stay", () => {
    // Same block, two genuinely different offers: one let by the year through
    // an agent, one sold by the night.
    const rental = ours({ id: "a", title: "Eden Heights", kind: "rental", lat: 6.4281, lng: 3.4219 });
    const nightly = ours({ id: "b", title: "Eden Heights", kind: "shortlet", lat: 6.4281, lng: 3.4219 });
    expect(sameProperty(rental, nightly)).toBe(false);
  });

  it("falls back to the strict rule when either side has no coordinate", () => {
    // `listings.latitude` is nullable and the wizard does not force a pin, so
    // this is a real state rather than a hypothetical.
    const unplaced = ours({ id: "a", title: "Eko Hotel & Suites" });
    const placedSimilar = fromLiteapi({
      id: "b",
      title: "Eko Hotels and Suites",
      lat: 6.4281,
      lng: 3.4219,
    });
    const placedIdentical = fromLiteapi({
      id: "c",
      title: "Eko Hotel & Suites",
      lat: 6.4281,
      lng: 3.4219,
    });

    // Similar but not identical: without geometry to confirm it, refused.
    expect(sameProperty(unplaced, placedSimilar)).toBe(false);
    // Identical name and city: the old rule, which still holds.
    expect(sameProperty(unplaced, placedIdentical)).toBe(true);
  });

  it("does not merge identically named places in different cities without coordinates", () => {
    const lagos = ours({ id: "a", title: "Chicken Republic", kind: "restaurant" });
    const abuja = fromPlaces({
      id: "b",
      title: "Chicken Republic",
      kind: "restaurant",
      city: "Abuja",
      state: "FCT (Abuja)",
    });
    expect(sameProperty(lagos, abuja)).toBe(false);
  });
});

describe("the merged shelf", () => {
  it("drops a partner hotel we already list ourselves, and keeps ours", () => {
    const mine = ours({ id: "mine", title: "Eko Hotel & Suites", lat: 6.4281, lng: 3.4219 });
    const theirs = fromLiteapi({
      id: "partner-liteapi-99",
      title: "Eko Hotels and Suites",
      lat: 6.4283,
      lng: 3.4222,
    });

    const out = dedupeListings([mine, theirs]);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("mine");
    expect(out[0]!.verified).toBe(true);
  });

  it("never lets a partner record replace a first-party one, whatever it carries", () => {
    // The partner record is richer (it has a price, ours does not). It still
    // loses, because verification is not a tie-break.
    const mine = ours({ id: "mine", title: "Eko Hotel", priceMinor: 0, lat: 6.4281, lng: 3.4219 });
    const theirs = fromLiteapi({ id: "theirs", title: "Eko Hotel", lat: 6.4281, lng: 3.4219 });

    const out = dedupeListings([mine, theirs]);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("mine");
  });

  it("prefers the priced record when two partner feeds return one hotel", () => {
    // Places answers first with no price; LiteAPI answers with a real rate.
    // The guest should see the number.
    const google = fromPlaces({ id: "g", title: "Transcorp Hilton", lat: 9.0722, lng: 7.4801 });
    const lite = fromLiteapi({ id: "l", title: "Transcorp Hilton Abuja", lat: 9.0723, lng: 7.4803 });

    const out = dedupeListings([google, lite]);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("l");
    expect(out[0]!.priceMinor).toBeGreaterThan(0);
  });

  it("gives the winner the position the first record held", () => {
    // The stronger record takes the slot; it does not jump the queue. A feed
    // must not be able to reorder the shelf by answering better.
    const first = ours({ id: "first", title: "Maison Fahrenheit", lat: 6.428, lng: 3.421 });
    const google = fromPlaces({ id: "g", title: "Transcorp Hilton", lat: 9.0722, lng: 7.4801 });
    const last = ours({ id: "last", title: "The Wheatbaker", lat: 6.4474, lng: 3.4344 });
    const lite = fromLiteapi({ id: "l", title: "Transcorp Hilton Abuja", lat: 9.0723, lng: 7.4803 });

    const out = dedupeListings([first, google, last, lite]);
    expect(out.map((l) => l.id)).toEqual(["first", "l", "last"]);
  });

  it("keeps every distinct place, and keeps the caller's order", () => {
    const input = [
      ours({ id: "a", title: "Maison Fahrenheit", lat: 6.4281, lng: 3.4219 }),
      ours({ id: "b", title: "The Wheatbaker", lat: 6.4474, lng: 3.4344 }),
      fromPlaces({ id: "c", title: "Nok by Alara", kind: "restaurant", lat: 6.4402, lng: 3.4271 }),
    ];
    expect(dedupeListings(input).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("collapses the same id however often it arrives", () => {
    const one = fromLiteapi({ id: "partner-liteapi-7", title: "Eko Hotel", lat: 6.4281, lng: 3.4219 });
    expect(dedupeListings([one, one, one])).toHaveLength(1);
  });

  it("returns an empty list unchanged", () => {
    expect(dedupeListings([])).toEqual([]);
  });
});
