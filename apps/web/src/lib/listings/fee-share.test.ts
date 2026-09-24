import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";

import { annualRentMinor, feeShares, feeSortKey, formatBps, shareBps } from "./fee-share";
import { FEE_RULES, feeRuleFor } from "@/lib/trust/fee-rules";
import { SORTS } from "./search-params";
import type { Listing } from "./types";

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: "l",
    slug: "l",
    title: "l",
    kind: "rental",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    stateCode: "LA",
    priceMinor: 280_000_000, // ₦2,800,000 a year
    pricePeriod: "year",
    currency: "NGN",
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    bedrooms: 2,
    bathrooms: 2,
    ...over,
  };
}

describe("a year's rent", () => {
  it("annualises by multiplication only", () => {
    expect(annualRentMinor(listing())).toBe(280_000_000n);
    expect(annualRentMinor(listing({ pricePeriod: "quarter", priceMinor: 70_000_000 }))).toBe(280_000_000n);
    expect(annualRentMinor(listing({ pricePeriod: "month", priceMinor: 25_000_000 }))).toBe(300_000_000n);
  });

  it("has none for a sale, a stay, or a rent of nothing", () => {
    expect(annualRentMinor(listing({ intent: "sale" }))).toBeNull();
    expect(annualRentMinor(listing({ pricePeriod: "night" }))).toBeNull();
    expect(annualRentMinor(listing({ priceMinor: 0 }))).toBeNull();
  });
});

describe("shares in integer basis points", () => {
  it("computes the entry's own example", () => {
    // Agency fee ₦280,000 on ₦2,800,000 a year: 10.0%.
    expect(shareBps(28_000_000, 280_000_000n)).toBe(1_000);
    expect(formatBps(1_000, "en")).toBe("10.0%");
  });

  it("truncates rather than rounds, so a share is never printed larger than it is", () => {
    expect(shareBps(1, 3n)).toBe(3_333);
    expect(formatBps(3_333, "en")).toBe("33.3%");
    expect(formatBps(1_999, "en")).toBe("19.9%");
  });

  it("stays exact on very large figures", () => {
    const annual = 9_000_000_000_000n;
    expect(shareBps(900_000_000_000, annual)).toBe(1_000);
  });

  it("totals the three fees paid to the agent, and leaves undeclared fees out", () => {
    const shares = feeShares(
      listing({ agencyFeeMinor: 28_000_000, legalFeeMinor: 28_000_000, agreementFeeMinor: 14_000_000 }),
    )!;
    expect(shares.each.agency).toEqual({ minor: 28_000_000, bps: 1_000 });
    expect(shares.total).toEqual({ minor: 70_000_000, bps: 2_500, declared: 3 });

    /* Two of three declared: each prints its share, but there is no total,
       so leaving a fee out never looks cheaper. */
    const partial = feeShares(listing({ agencyFeeMinor: 28_000_000, legalFeeMinor: 0 }))!;
    expect(Object.keys(partial.each)).toEqual(["agency", "legal"]);
    expect(partial.total).toBeNull();
  });

  it("gives a declared zero 0.0% and an undeclared fee nothing", () => {
    expect(feeShares(listing({ agencyFeeMinor: 0 }))!.each.agency).toEqual({ minor: 0, bps: 0 });
    expect(feeShares(listing())!.total).toBeNull();
  });
});

describe("the sort", () => {
  it("is offered, on its own basis", () => {
    expect(SORTS.find((s) => s.key === "fees-asc")).toEqual({
      key: "fees-asc",
      label: "Lowest fees on top of rent",
      basis: "fees",
      short: "Lowest fees",
    });
  });

  it("keys on the total share, and has no key when nothing was stated", () => {
    expect(feeSortKey(listing({ agencyFeeMinor: 28_000_000, legalFeeMinor: 0, agreementFeeMinor: 0 }))).toBe(1_000);
    expect(feeSortKey(listing({ agencyFeeMinor: 28_000_000 }))).toBeNull();
    expect(feeSortKey(listing())).toBeNull();
    expect(feeSortKey(listing({ intent: "sale", agencyFeeMinor: 1 }))).toBeNull();
  });
});

describe("the law's number, as a fact", () => {
  it("is Lagos only, 10% each for agency and legal, with its source", () => {
    expect(feeRuleFor("LA")).toMatchObject({ agencyMaxBps: 1_000, legalMaxBps: 1_000, source: "Tenancy Law 2011" });
    expect(feeRuleFor("OY")).toBeNull();
    expect(feeRuleFor(undefined)).toBeNull();
    expect(FEE_RULES).toHaveLength(1);
  });

  it("is said as a fact and never as a verdict", () => {
    const copy = getDictionary("en").trustVisible.fees;
    const all = JSON.stringify(copy).toLowerCase();
    expect(all).not.toMatch(/illegal|unlawful|breach|violat|overcharg|too high|fair|unfair|—/);
  });

  it("is never drawn in the error colour", () => {
    const src = readFileSync(join(__dirname, "../../components/app/listing/ListingMoveIn.tsx"), "utf8");
    const block = src.slice(src.indexOf("fee-share-total") - 200, src.indexOf("fee-state-rule") + 600);
    expect(block).not.toMatch(/state-error|rose|danger/);
  });
});
