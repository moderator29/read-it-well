import { describe, expect, it } from "vitest";
import { PRICE_BOUNDS, priceScale } from "./price-bounds";

describe("priceScale", () => {
  it("is the Rent scale with no market, never the dearest sale", () => {
    expect(priceScale(undefined)).toEqual({ floor: 0, ceiling: 30_000_000, step: 100_000, span: 30_000_000 });
    expect(priceScale("rent").ceiling).toBe(30_000_000);
  });
  it("rescales for Buy", () => {
    expect(priceScale("sale")).toEqual({ floor: 0, ceiling: 500_000_000, step: 5_000_000, span: 500_000_000 });
  });
  it("divides each range into whole steps", () => {
    for (const bounds of Object.values(PRICE_BOUNDS)) expect(bounds.ceiling % bounds.step).toBe(0);
  });
});
