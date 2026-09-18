import { describe, expect, it } from "vitest";

import { coinIdSchema, marketsQuerySchema, pairsQuerySchema } from "./route";

/**
 * The query schemas coerce rather than refuse, so every GET the surface can
 * build answers the contract. The path slug refuses, because a bad one can
 * only come from a hand-edited URL.
 */
describe("crypto query schemas", () => {
  it("defaults the markets query and clamps what it can", () => {
    expect(marketsQuerySchema.parse({})).toEqual({ vs: "ngn", per: 50, page: 1 });
    expect(marketsQuerySchema.parse({ vs: "eur", per: "500", page: "-3" })).toEqual({
      vs: "ngn",
      per: 50,
      page: 1,
    });
    expect(marketsQuerySchema.parse({ vs: "usd", per: "10", page: "3" })).toEqual({
      vs: "usd",
      per: 10,
      page: 3,
    });
  });

  it("trims and bounds the pairs query", () => {
    expect(pairsQuerySchema.parse({})).toEqual({ network: "eth", query: "" });
    expect(pairsQuerySchema.parse({ network: "Base", query: "  weth " })).toEqual({
      network: "base",
      query: "weth",
    });
    expect(pairsQuerySchema.parse({ network: "no spaces", query: "<script>" })).toEqual({
      network: "eth",
      query: "",
    });
  });

  it("accepts a slug and refuses anything else as a coin id", () => {
    expect(coinIdSchema.safeParse("bitcoin").success).toBe(true);
    expect(coinIdSchema.safeParse("wrapped-bitcoin").success).toBe(true);
    expect(coinIdSchema.safeParse("../etc").success).toBe(false);
    expect(coinIdSchema.safeParse("").success).toBe(false);
  });
});
