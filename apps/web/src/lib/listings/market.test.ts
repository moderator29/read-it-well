import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hrefForListing } from "./href";
import { isPropertyMarket, marketOf } from "./market";

/**
 * UX-10 / UI-P2-03 / UX-04: the market, and so the template and the route,
 * follows the price period and the intent. The kind is only the fallback.
 */
describe("which market a listing is in", () => {
  it("reads a villa or an apartment let by the year as a tenancy, not a stay", () => {
    for (const kind of ["villa", "apartment", "home", "shortlet", "hotel"] as const) {
      expect(marketOf({ kind, intent: "rent", pricePeriod: "year", priceMinor: 2_500_000_000 })).toBe("tenancy");
    }
    expect(marketOf({ kind: "villa", intent: "rent", pricePeriod: "month", priceMinor: 1 })).toBe("tenancy");
  });

  it("reads a nightly rate as a stay and a per-head rate as a table", () => {
    expect(marketOf({ kind: "shortlet", intent: "rent", pricePeriod: "night", priceMinor: 8_500_000 })).toBe("stay");
    expect(marketOf({ kind: "restaurant", intent: "rent", pricePeriod: "guest", priceMinor: 650_000 })).toBe("dining");
    expect(marketOf({ kind: "experience", intent: "rent", pricePeriod: "guest", priceMinor: 650_000 })).toBe(
      "experience",
    );
  });

  it("reads restaurant premises let on a rent as a tenancy", () => {
    expect(marketOf({ kind: "restaurant", intent: "rent", pricePeriod: "year", priceMinor: 300_000_000 })).toBe(
      "tenancy",
    );
  });

  it("reads any sale as a sale", () => {
    expect(marketOf({ kind: "villa", intent: "sale", priceMinor: 1 })).toBe("sale");
    expect(marketOf({ kind: "hotel", intent: "sale" })).toBe("sale");
  });

  it("falls back to the kind when no price is stated", () => {
    /* The headline's "nothing stated" default is a year; it is not a statement. */
    expect(marketOf({ kind: "shortlet", intent: "rent", pricePeriod: "year", priceMinor: 0 })).toBe("stay");
    expect(marketOf({ kind: "restaurant" })).toBe("dining");
    expect(marketOf({ kind: "rental" })).toBe("tenancy");
    expect(marketOf({ kind: "hotel" })).toBe("stay");
  });

  it("names the property markets", () => {
    expect(isPropertyMarket("tenancy")).toBe(true);
    expect(isPropertyMarket("sale")).toBe(true);
    expect(isPropertyMarket("stay")).toBe(false);
    expect(isPropertyMarket("dining")).toBe(false);
  });
});

describe("where a listing opens", () => {
  it("opens a yearly villa on the property page, never under Stays", () => {
    expect(hrefForListing("villa", "v1", { intent: "rent", pricePeriod: "year", priceMinor: 2_500_000_000 })).toBe(
      "/listing/v1",
    );
    expect(hrefForListing("apartment", "a1", { intent: "rent", pricePeriod: "year", priceMinor: 850_000_000 })).toBe(
      "/listing/a1",
    );
  });

  it("opens a nightly shortlet as a stay and a per-head restaurant as a restaurant", () => {
    expect(hrefForListing("shortlet", "s1", { intent: "rent", pricePeriod: "night", priceMinor: 1 })).toBe("/stay/s1");
    expect(hrefForListing("restaurant", "r1", { intent: "rent", pricePeriod: "guest", priceMinor: 1 })).toBe(
      "/restaurant/r1",
    );
    expect(hrefForListing("restaurant", "r2", { intent: "rent", pricePeriod: "year", priceMinor: 1 })).toBe(
      "/listing/r2",
    );
  });

  it("keeps the kind's default for a caller with only the kind", () => {
    expect(hrefForListing("hotel", "h1")).toBe("/stay/h1");
    expect(hrefForListing("rental", "x1")).toBe("/listing/x1");
  });
});

describe("the templates and routes follow the market", () => {
  const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");

  it("the listing page decides bookability and its pill by market", () => {
    const page = src("app/(app)/listing/[id]/page.tsx");
    expect(page).toContain("const listingMarket = marketOf(listing);");
    expect(page).toContain('const isRental = listingMarket === "tenancy";');
    expect(page).toContain('const isRestaurant = listingMarket === "dining";');
    expect(page).toContain("MARKET_PILL[listingMarket]");
    expect(page).not.toContain('listing.kind === "rental"');
  });

  it("a tenancy or a sale reached by /stay or /restaurant moves to /listing", () => {
    for (const file of ["app/(app)/stay/[id]/page.tsx", "app/(app)/restaurant/[id]/page.tsx"]) {
      expect(src(file), file).toMatch(/isPropertyMarket\(marketOf\(listing\)\)\) redirect\(`\/listing\/\$\{id\}`\)/);
    }
  });

  it("every card builds its href from the listing's market facts", () => {
    for (const file of ["components/app/ListingCard.tsx", "components/app/stays/stay-card-model.ts"]) {
      expect(src(file), file).toContain("hrefForListing(listing.kind, listing.id, marketFactsOf(listing))");
    }
    expect(src("app/api/assistant/route.ts").match(/marketFactsOf\(l\)/g)?.length).toBe(2);
  });
});
