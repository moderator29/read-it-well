import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("keeps the drawer's Shortlet and Hotel options full (review finding 1)", () => {
    const shortlet = facts({ kind: "shortlet", pricePeriod: "night" });
    expect(matchesFacts(shortlet, { intent: "rent", kind: "shortlet" })).toBe(true);
    expect(matchesFacts(facts({ kind: "hotel", pricePeriod: "night" }), { intent: "rent", kind: "hotel" })).toBe(true);
    expect(matchesFacts(facts({ kind: "apartment", pricePeriod: "night" }), { intent: "rent", kind: "apartment" })).toBe(false);
  });

  it("a Listing is judged the same way as its facts, so alerts agree with the shelf", () => {
    const listing = { ...facts({ kind: "shortlet", pricePeriod: "night" }), q: undefined };
    expect(matchesFacts(listing, { intent: "rent" })).toBe(false);
  });

  it("leaves an unfiltered shelf alone", () => {
    expect(matchesFacts(facts({ pricePeriod: "night" }), {})).toBe(true);
  });
});

/**
 * UX-07: "Rent" returned nightly shortlets, hotel rooms and a restaurant,
 * because they all carry intent rent. The rent market is tenancies: a place
 * priced per night or per head, or a stay or table by kind, does not answer
 * it. The shelf chip names the market instead of "Any market".
 */
const base: ListingFacts = {
  kind: "rental",
  priceMinor: 250_000_000,
  intent: "rent",
  pricePeriod: "year",
  bedrooms: 2,
  bathrooms: 2,
  amenities: [],
  instantBook: false,
  verified: false,
  isDemo: false,
};

describe("the rent market (UX-07)", () => {
  it("keeps tenancies by the year, quarter or month", () => {
    for (const pricePeriod of ["year", "quarter", "month"] as const) {
      expect(matchesFacts({ ...base, pricePeriod }, { intent: "rent" })).toBe(true);
    }
    expect(matchesFacts({ ...base, kind: "apartment" }, { intent: "rent" })).toBe(true);
  });

  it("leaves out stays and tables, by price period or by kind", () => {
    expect(matchesFacts({ ...base, kind: "shortlet", pricePeriod: "night" }, { intent: "rent" })).toBe(false);
    expect(matchesFacts({ ...base, kind: "apartment", pricePeriod: "night" }, { intent: "rent" })).toBe(false);
    expect(matchesFacts({ ...base, kind: "hotel", pricePeriod: "night" }, { intent: "rent" })).toBe(false);
    expect(matchesFacts({ ...base, kind: "restaurant", pricePeriod: "guest" }, { intent: "rent" })).toBe(false);
    expect(matchesFacts({ ...base, kind: "hotel" }, { intent: "rent" })).toBe(false);
  });

  it("changes nothing when no market is chosen", () => {
    expect(matchesFacts({ ...base, kind: "shortlet", pricePeriod: "night" }, {})).toBe(true);
  });

  it("narrows in the query too, and the chip says Rent", () => {
    const repo = readFileSync(join(__dirname, "supabase-repository.ts"), "utf8");
    /* One rule for the SQL and for matchesFacts: `rentMeansTenancy` (V-26). */
    /* Any indentation: OPS-11 moved the filters into `catalogueQuery`, a module-level function. */
    expect(repo).toMatch(/if \(filter\.propertySide \|\| rentMeansTenancy\(filter\)\) \{\n\s+query = query\.or\("rate_minor\.is\.null,rate_minor\.lte\.0"\);/);
    const bar = readFileSync(join(__dirname, "..", "..", "components", "app", "search", "ShelfBar.tsx"), "utf8");
    expect(bar).toContain('query.intent === "rent"\n          ? copy.marketRent');
  });
});
