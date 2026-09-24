import { describe, expect, it } from "vitest";
import { parseWords } from "./query-parse";

const M = 1_000_000_00; // one million naira, in kobo

describe("parseWords, the WhatsApp table", () => {
  const table: [string, Partial<ReturnType<typeof parseWords>>][] = [
    ["2br under 2m yaba", { bedrooms: 2, maxMinor: 2 * M, rest: "yaba", shapes: [] }],
    ["3bdr duplex lekki", { bedrooms: 3, shapes: ["duplex"], rest: "lekki" }],
    ["selfcon in akoka", { shapes: ["self_contain"], rest: "akoka" }],
    ["self con akoka", { shapes: ["self_contain"], rest: "akoka" }],
    ["Self contained in Akoka", { shapes: ["self_contain"], rest: "akoka" }],
    ["s/c yaba", { shapes: ["self_contain"], rest: "yaba" }],
    ["mini flat surulere", { shapes: ["mini_flat"], rest: "surulere" }],
    ["room and parlour ikorodu", { shapes: ["room_parlour"], rest: "ikorodu" }],
    ["room & parlour", { shapes: ["room_parlour"], rest: "" }],
    ["4 bedroom semi detached with bq", { bedrooms: 4, shapes: ["semi_detached"], withBq: true, rest: "" }],
    ["bq ikoyi", { shapes: ["boys_quarters"], withBq: false, rest: "ikoyi" }],
    ["duplex bq", { shapes: ["duplex"], withBq: true }],
    ["flat N2m", { shapes: ["flat"], maxMinor: 2 * M }],
    ["2.5 million", { maxMinor: 2.5 * M }],
    ["₦1.5m", { maxMinor: 1.5 * M }],
    ["above 800k", { minMinor: 800_000_00 }],
    ["no agency fee 2 bed", { ownerDirect: true, bedrooms: 2 }],
    ["two bedroom flat to let", { bedrooms: 2, shapes: ["flat"], intent: "rent" }],
    ["duplex for sale", { shapes: ["duplex"], intent: "sale" }],
    ["mini flat Yaba/Akoka", { shapes: ["mini_flat"], areas: ["yaba", "akoka"], rest: "" }],
  ];
  for (const [input, expected] of table) {
    it(input, () => {
      const got = parseWords(input);
      expect(got.recognised).toBe(true);
      expect(got).toMatchObject(expected);
    });
  }

  it("leaves what it does not know as text, untouched", () => {
    expect(parseWords("Lekki Phase 1")).toMatchObject({ recognised: false, rest: "lekki phase 1" });
    expect(parseWords("house in Ikeja")).toMatchObject({ recognised: false, rest: "house in ikeja" });
  });

  it("never guesses a number it did not see as money", () => {
    const got = parseWords("15 adeola odeku 2000000");
    expect(got.maxMinor).toBeUndefined();
    expect(got.recognised).toBe(false);
  });

  it("reads nothing from its own leftovers, so the page redirects once", () => {
    for (const [input] of table) {
      expect(parseWords(parseWords(input).rest).recognised).toBe(false);
    }
  });
});
