import { describe, expect, it } from "vitest";
import { matchesFacts, PROPERTY_KINDS, isStayPeriod, type ListingFacts } from "./filter";
import { SORTS, parseDiscoveryQuery } from "./search-params";
import { shelfFilter, shelfPoolFilter, staySideHref, parseShelfQuery } from "@/components/app/search/shelf-query";

/* V-67: the Property side's shelf holds no stays. */
const facts = (over: Partial<ListingFacts>): ListingFacts =>
  ({
    kind: "apartment",
    priceMinor: 100,
    intent: "rent",
    pricePeriod: "year",
    bedrooms: 1,
    bathrooms: 1,
    amenities: [],
    instantBook: false,
    verified: false,
    isDemo: false,
    source: "first-party",
    ...over,
  }) as ListingFacts;

describe("the Property side", () => {
  it("leaves out a night and a head, in the results and in the drawer's pool", () => {
    const query = parseShelfQuery({});
    for (const filter of [shelfFilter(query), shelfPoolFilter(query)]) {
      expect(filter.propertySide).toBe(true);
      expect(matchesFacts(facts({ kind: "shortlet", pricePeriod: "night" }), filter)).toBe(false);
      expect(matchesFacts(facts({ kind: "restaurant", pricePeriod: "guest" }), filter)).toBe(false);
      expect(matchesFacts(facts({}), filter)).toBe(true);
      expect(matchesFacts(facts({ intent: "sale", pricePeriod: undefined }), filter)).toBe(true);
    }
  });

  it("sends a stay category typed here to the Stays side, with the words kept", () => {
    expect(staySideHref("hotel", "Ikeja")).toBe("/stays/search?type=hotel&q=Ikeja");
    expect(staySideHref("shortlet", undefined)).toBe("/stays/search?type=shortlet");
    expect(staySideHref("restaurant", "Jabi")).toBe("/restaurants");
    expect(staySideHref("apartment", "Yaba")).toBeNull();
    expect(staySideHref(undefined, undefined)).toBeNull();
  });

  it("offers no stay kind and no Top rated sort", () => {
    for (const kind of PROPERTY_KINDS) expect(["hotel", "shortlet", "restaurant", "experience"]).not.toContain(kind);
    expect(SORTS.map((s) => s.key)).not.toContain("top-rated");
    expect(parseDiscoveryQuery({ sort: "top-rated" }).sort).toBe("recommended");
  });

  it("knows a stay period", () => {
    expect(isStayPeriod("night")).toBe(true);
    expect(isStayPeriod("guest")).toBe(true);
    expect(isStayPeriod("year")).toBe(false);
  });
});
