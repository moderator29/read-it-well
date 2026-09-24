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
    /* batch 4 review */
    ["2m-3m yaba", { minMinor: 2 * M, maxMinor: 3 * M, rest: "yaba" }],
    ["between 1.5m and 2m", { minMinor: 1.5 * M, maxMinor: 2 * M, rest: "" }],
    ["2 to 3m lekki", { minMinor: 2 * M, maxMinor: 3 * M, rest: "lekki" }],
    ["flat 1.2m per annum", { shapes: ["flat"], maxMinor: 1.2 * M, rest: "" }],
    ["mini flat 600k pa", { shapes: ["mini_flat"], maxMinor: 600_000_00, rest: "" }],
    ["selfcon 400k p.a.", { shapes: ["self_contain"], maxMinor: 400_000_00, rest: "" }],
    ["flat 150k monthly", { shapes: ["flat"], maxMinor: 150_000_00, rest: "" }],
    ["duplex 5m yearly", { shapes: ["duplex"], maxMinor: 5 * M, rest: "" }],
    ["2 bed 1.5 million naira", { bedrooms: 2, maxMinor: 1.5 * M, rest: "" }],
    ["3+ bedroom flat", { bedrooms: 3, shapes: ["flat"], rest: "" }],
    ["N1,500,000 flat", { maxMinor: 1.5 * M, shapes: ["flat"], rest: "" }],
    ["serviced 2 bed ikoyi", { serviced: true, bedrooms: 2, rest: "ikoyi" }],
    ["2 bed + bq", { bedrooms: 2, withBq: true, rest: "" }],
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

  it("refuses a comma decimal rather than reading 1,5m as 5m", () => {
    const got = parseWords("flat 1,5m yaba");
    expect(got.maxMinor).toBeUndefined();
    expect(got.shapes).toEqual(["flat"]);
    expect(got.rest).toContain("1,5m");
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
