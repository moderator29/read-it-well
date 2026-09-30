import { describe, expect, it } from "vitest";
import { priceCheckHref, subjectForListing } from "./listing-context";

const FLAT = {
  id: "00000000-0000-4000-8000-00000000a001",
  kind: "apartment" as const,
  area: "Yaba",
  city: "Lagos",
  stateCode: "LA",
  lat: 6.5095,
  lng: 3.3711,
  intent: "rent" as const,
  pricePeriod: "year" as const,
  bedrooms: 2,
  sizeSqm: undefined,
  isDemo: false,
};

describe("price context on the listing (B8)", () => {
  it("builds the subject from the listing's own facts and excludes the listing itself", () => {
    const s = subjectForListing(FLAT)!;
    expect(s).toMatchObject({ lat: 6.5095, lng: 3.3711, stateCode: "LA", area: "Yaba", propertyType: "apartment", intent: "rent", rentPeriod: "year", bedrooms: 2, fromListingId: FLAT.id });
  });

  it("deep-links to /price in the page's own parameters", () => {
    expect(priceCheckHref(subjectForListing(FLAT)!)).toBe(
      "/price?state=LA&area=Yaba&lat=6.5095&lng=3.3711&type=apartment&intent=rent&period=year&beds=2",
    );
  });

  it("draws no door where the tool cannot answer", () => {
    expect(subjectForListing({ ...FLAT, isDemo: true })).toBeNull();
    expect(subjectForListing({ ...FLAT, lat: undefined })).toBeNull();
    expect(subjectForListing({ ...FLAT, kind: "shortlet" })).toBeNull();
    expect(subjectForListing({ ...FLAT, kind: "land" })).toBeNull();
    expect(subjectForListing({ ...FLAT, pricePeriod: "month" })).toBeNull();
  });

  it("asks a sale without a rent period", () => {
    const s = subjectForListing({ ...FLAT, kind: "home", intent: "sale", pricePeriod: undefined })!;
    expect(priceCheckHref(s)).not.toContain("period=");
    expect(priceCheckHref(s)).toContain("intent=sale");
  });
});
