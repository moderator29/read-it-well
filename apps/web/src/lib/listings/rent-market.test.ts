import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchesFacts, type ListingFacts } from "./filter";

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

describe("the rent market", () => {
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
    expect(repo).toContain('if (filter.intent === "rent") query = query.or("rate_minor.is.null,rate_minor.lte.0");');
    const bar = readFileSync(join(__dirname, "..", "..", "components", "app", "search", "ShelfBar.tsx"), "utf8");
    expect(bar).toContain('query.intent === "rent"\n          ? copy.marketRent');
  });
});
