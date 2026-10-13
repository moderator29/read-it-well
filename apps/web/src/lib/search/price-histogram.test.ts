import { describe, expect, it } from "vitest";
import { factsOf } from "@/lib/listings/filter";
import type { Listing } from "@/lib/listings/types";
import { bucketInRange, priceFigures, priceHistogram } from "./price-histogram";

function home(id: string, over: Partial<Listing>): Listing {
  return {
    id,
    slug: id,
    title: id,
    kind: "rental",
    intent: "rent",
    pricePeriod: "year",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 0,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 1,
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

describe("the price histogram's buckets", () => {
  it("counts each figure into its slice of the track", () => {
    /* A 100 track in 4 buckets of 25. */
    expect(priceHistogram([1, 24, 25, 49, 50, 99], 100, 4)).toEqual([2, 2, 1, 1]);
  });

  it("puts a figure over the top of the track into the last bucket, the track's '+'", () => {
    expect(priceHistogram([100, 5_000], 100, 4)).toEqual([0, 0, 0, 2]);
  });

  it("leaves out unstated, zero and broken figures: unstated is not cheap", () => {
    expect(priceHistogram([null, 0, -5, Number.NaN, Number.POSITIVE_INFINITY, 10], 100, 4)).toEqual([1, 0, 0, 0]);
  });

  it("returns empty buckets for an empty pool or a broken track", () => {
    expect(priceHistogram([], 100, 3)).toEqual([0, 0, 0]);
    expect(priceHistogram([10], 0, 3)).toEqual([0, 0, 0]);
  });

  it("totals exactly the homes with a stated figure", () => {
    const figures = [5, 10, null, 80, 200];
    const total = priceHistogram(figures, 100, 7).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(4);
  });

  it("marks the buckets inside the chosen range, the open last bucket included", () => {
    const inRange = [0, 1, 2, 3].map((i) => bucketInRange(i, 4, 100, 30, 60));
    expect(inRange).toEqual([false, true, true, false]);
    const open = [0, 1, 2, 3].map((i) => bucketInRange(i, 4, 100, 0, Number.POSITIVE_INFINITY));
    expect(open).toEqual([true, true, true, true]);
  });
});

describe("the figures the bars are drawn from", () => {
  const pool = [
    home("cheap", { priceMinor: 1_000_000_00, moveInCostMinor: 1_500_000_00, moveInCostStated: true, bedrooms: 1 }),
    home("mid", { priceMinor: 3_000_000_00, moveInCostMinor: 4_000_000_00, moveInCostStated: true, bedrooms: 3 }),
    home("silent", { priceMinor: 2_000_000_00, bedrooms: 3 }),
    home("sale", { intent: "sale", pricePeriod: undefined, priceMinor: 90_000_000_00, bedrooms: 4 }),
  ].map(factsOf);

  it("on the Rent market judges the cash at the door, as the budget filter does", () => {
    const figures = priceFigures(pool, { intent: "rent", propertySide: true });
    /* The sale is another market; the silent tenancy has no cash figure. */
    expect(figures).toEqual([1_500_000_00, 4_000_000_00, null]);
  });

  it("applies every other filter in the draft but not the price bounds being chosen", () => {
    const figures = priceFigures(pool, { intent: "rent", bedrooms: 3, maxPriceMinor: 1, propertySide: true });
    expect(figures).toEqual([4_000_000_00, null]);
  });
});
