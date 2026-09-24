import { describe, expect, it } from "vitest";
import { matchesFacts, type ListingFacts } from "./filter";

/* V-26: the rent market is tenancies, as the deleted `/rent` shelf was. */
const facts = (over: Partial<ListingFacts>): ListingFacts =>
  ({
    kind: "apartment",
    priceMinor: 100,
    intent: "rent",
    bedrooms: 1,
    bathrooms: 1,
    amenities: [],
    instantBook: false,
    verified: false,
    isDemo: false,
    source: "first-party",
    ...over,
  }) as ListingFacts;

describe("the rent market", () => {
  it("holds a flat to let by the year, whatever its category", () => {
    expect(matchesFacts(facts({ pricePeriod: "year" }), { intent: "rent" })).toBe(true);
    expect(matchesFacts(facts({ kind: "home", pricePeriod: "year" }), { intent: "rent" })).toBe(true);
  });

  it("does not hold a nightly shortlet, which is a stay", () => {
    expect(matchesFacts(facts({ kind: "shortlet", pricePeriod: "night" }), { intent: "rent" })).toBe(false);
  });

  it("does not guess when the source does not say", () => {
    expect(matchesFacts(facts({}), { intent: "rent" })).toBe(true);
  });

  it("leaves an unfiltered shelf alone", () => {
    expect(matchesFacts(facts({ pricePeriod: "night" }), {})).toBe(true);
  });
});
