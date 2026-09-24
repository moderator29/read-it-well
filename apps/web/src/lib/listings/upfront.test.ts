import { describe, expect, it } from "vitest";
import { cashAtDoor, upfrontMonths, upfrontText } from "./upfront";
import { budgetFigure, matchesFacts, type ListingFacts } from "./filter";

const YEAR = 1_000_000_00; // 1m naira a year, in kobo

function tenancy(over: Partial<ListingFacts> = {}): ListingFacts {
  return {
    kind: "apartment",
    intent: "rent",
    pricePeriod: "year",
    priceMinor: YEAR,
    moveInCostMinor: 1_500_000_00,
    bedrooms: 2,
    bathrooms: 2,
    amenities: [],
    instantBook: false,
    verified: false,
    isDemo: false,
    ...over,
  };
}

const COPY = {
  upfrontMonth: "One month upfront",
  upfrontMonths: "{n} months upfront",
  upfrontYear: "One year upfront",
  upfrontYears: "{n} years upfront",
};

describe("upfrontMonths", () => {
  it("is the larger of one period and the shortest tenancy", () => {
    expect(upfrontMonths("year", undefined)).toBe(12);
    expect(upfrontMonths("year", 24)).toBe(24);
    expect(upfrontMonths("year", 6)).toBe(12);
    expect(upfrontMonths("month", 6)).toBe(6);
    expect(upfrontMonths("quarter", undefined)).toBe(3);
  });
  it("is null when the price is not a tenancy", () => {
    expect(upfrontMonths("night", 12)).toBeNull();
    expect(upfrontMonths(undefined, 12)).toBeNull();
  });
});

describe("cashAtDoor", () => {
  it("is the move-in total when one period is asked", () => {
    expect(cashAtDoor(tenancy())).toEqual({ minor: 1_500_000_00, upfrontMonths: 12, periods: 1, restated: false });
  });
  it("adds the rent for every whole period past the first", () => {
    expect(cashAtDoor(tenancy({ minimumTenancyMonths: 24 }))).toEqual({
      minor: 2_500_000_00,
      upfrontMonths: 24,
      periods: 2,
      restated: true,
    });
  });
  it("never guesses a figure for a part period", () => {
    const cash = cashAtDoor(tenancy({ minimumTenancyMonths: 18 }));
    expect(cash).toEqual({ minor: 1_500_000_00, upfrontMonths: 18, periods: 1, restated: false });
  });
  it("has no figure without a move-in total, for a sale, or for a stay", () => {
    expect(cashAtDoor(tenancy({ moveInCostMinor: undefined }))).toBeNull();
    expect(cashAtDoor(tenancy({ intent: "sale" }))).toBeNull();
    expect(cashAtDoor(tenancy({ pricePeriod: "night" }))).toBeNull();
  });
});

describe("the budget on the Rent market", () => {
  const rent = { intent: "rent" as const };
  it("is judged against the cash at the door", () => {
    expect(budgetFigure(tenancy({ minimumTenancyMonths: 24 }), rent)).toBe(2_500_000_00);
    // 2m budget: the rent fits, the door price of two years does not.
    expect(matchesFacts(tenancy({ minimumTenancyMonths: 24 }), { ...rent, maxPriceMinor: 2_000_000_00 })).toBe(false);
    expect(matchesFacts(tenancy(), { ...rent, maxPriceMinor: 2_000_000_00 })).toBe(true);
  });
  it("never passes a tenancy that states no move-in figure", () => {
    expect(matchesFacts(tenancy({ moveInCostMinor: undefined }), { ...rent, maxPriceMinor: 9_000_000_00 })).toBe(false);
  });
  it("is still the headline price on the sale market and with no market", () => {
    expect(budgetFigure(tenancy(), {})).toBe(YEAR);
    expect(matchesFacts(tenancy({ moveInCostMinor: undefined }), { maxPriceMinor: 2_000_000_00 })).toBe(true);
  });
});

describe("one year upfront at most", () => {
  it("keeps a yearly let and drops a two-year demand", () => {
    expect(matchesFacts(tenancy(), { maxUpfrontMonths: 12 })).toBe(true);
    expect(matchesFacts(tenancy({ minimumTenancyMonths: 24 }), { maxUpfrontMonths: 12 })).toBe(false);
  });
  it("is strict about listings with no upfront demand", () => {
    expect(matchesFacts(tenancy({ pricePeriod: undefined }), { maxUpfrontMonths: 12 })).toBe(false);
  });
});

describe("upfrontText", () => {
  it("reads whole years as years", () => {
    expect(upfrontText(12, COPY)).toBe("One year upfront");
    expect(upfrontText(24, COPY)).toBe("2 years upfront");
    expect(upfrontText(18, COPY)).toBe("18 months upfront");
    expect(upfrontText(1, COPY)).toBe("One month upfront");
  });
});

describe("the upfront address", () => {
  it("round-trips upfront=12 and reaches the filter", async () => {
    const { parseDiscoveryQuery, toFilter, toSearchHref, activeFilterCount } = await import("./search-params");
    const query = parseDiscoveryQuery({ upfront: "12" });
    expect(query.maxUpfront).toBe(12);
    expect(toFilter(query).maxUpfrontMonths).toBe(12);
    expect(toSearchHref(query)).toContain("upfront=12");
    expect(activeFilterCount(query)).toBe(1);
    expect(parseDiscoveryQuery({ upfront: "999" }).maxUpfront).toBeUndefined();
  });
  it("is dropped outside the Rent market's tenancies", async () => {
    const { parseShelfQuery, shelfFilter } = await import("@/components/app/search/shelf-query");
    expect(shelfFilter(parseShelfQuery({ upfront: "12", market: "rent" })).maxUpfrontMonths).toBe(12);
    expect(shelfFilter(parseShelfQuery({ upfront: "12", market: "buy" })).maxUpfrontMonths).toBeUndefined();
  });
});
