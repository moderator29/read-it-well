import { describe, expect, it } from "vitest";
import { canonicalSearch } from "@/lib/saved/searches";
import { listingSearchHref, listingSearchParams } from "./next-actions";

describe("an answered Price Check leads to the listings it describes", () => {
  it("carries the market, type, bedrooms and the typed area", () => {
    expect(
      listingSearchParams({ intent: "rent", propertyType: "apartment", bedrooms: 2, area: " Yaba ", lgaName: "Lagos Mainland", stateName: "Lagos" }),
    ).toEqual({ market: "rent", type: "apartment", beds: "2", area: "yaba" });
  });

  it("falls back to the local government, then the state, as free text", () => {
    expect(listingSearchParams({ intent: "sale", propertyType: "home", bedrooms: null, area: null, lgaName: "Ikeja", stateName: "Lagos" }).q).toBe("Ikeja");
    expect(listingSearchParams({ intent: "sale", propertyType: "home", bedrooms: 0, area: "", lgaName: null, stateName: "Lagos" })).toEqual({
      market: "buy",
      type: "home",
      q: "Lagos",
    });
  });

  it("is a search the saved-search alert can keep", () => {
    const params = listingSearchParams({ intent: "rent", propertyType: "home", bedrooms: 3, area: "Lekki", lgaName: null, stateName: "Lagos" });
    expect(canonicalSearch(params).key.length).toBeGreaterThan(0);
    expect(listingSearchHref({ intent: "rent", propertyType: "home", bedrooms: 3, area: "Lekki", lgaName: null, stateName: "Lagos" })).toBe(
      "/search?market=rent&type=home&beds=3&area=lekki",
    );
  });
});
