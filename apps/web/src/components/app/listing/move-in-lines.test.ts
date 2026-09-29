import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { moveInLines } from "./move-in-lines";
import type { Listing } from "@/lib/listings/types";

/**
 * THE HONESTY RULE OF TRACK H, ASSERTED.
 *
 * The product rule: "a cost the lister has not declared is drawn as not
 * declared, with the words, never as zero. Zero is a claim." The two facts this
 * file exists to keep apart are an UNDECLARED cost, which carries no number at
 * all, and a DECLARED ZERO, which is a lister saying there is no such fee and
 * is the whole argument of the direct model in one line.
 *
 * `moveInLines` is the only place that decides which is which, so it is the
 * only place worth asserting. The component around it turns `minor === undefined`
 * into the words and a declared zero into "No agency fee"; both branches read
 * this function's output and nothing else.
 */

const copy = getDictionary("en").moveIn;

function listing(over: Partial<Listing>): Listing {
  return {
    id: "l1",
    title: "A flat",
    city: "Lagos",
    area: "Lekki",
    kind: "rental",
    priceMinor: 250_000_000,
    currency: "NGN",
    pricePeriod: "year",
    bedrooms: 3,
    bathrooms: 3,
    rating: 0,
    reviewCount: 0,
    verified: false,
    amenities: [],
    photos: [],
    ...over,
  } as Listing;
}

function line(rows: ReturnType<typeof moveInLines>, key: string) {
  const found = rows.find((row) => row.key === key);
  if (!found) throw new Error(`no ${key} line`);
  return found;
}

describe("moveInLines", () => {
  it("lists every cost a tenant meets, declared or not", () => {
    const rows = moveInLines(listing({}), copy);
    expect(rows.map((row) => row.key)).toEqual([
      "rent",
      "agency",
      "legal",
      "agreement",
      "caution",
      "service",
    ]);
  });

  it("leaves an undeclared cost with no figure at all, never a zero", () => {
    const rows = moveInLines(listing({}), copy);
    expect(line(rows, "agency").minor).toBeUndefined();
    expect(line(rows, "legal").minor).toBeUndefined();
    expect(line(rows, "caution").minor).toBeUndefined();
    expect(line(rows, "service").minor).toBeUndefined();
  });

  it("keeps a declared zero, because a stated zero is a different fact", () => {
    const rows = moveInLines(listing({ agencyFeeMinor: 0 }), copy);
    expect(line(rows, "agency").minor).toBe(0);
  });

  it("carries the rent period as the basis rather than baking it into the label", () => {
    expect(line(moveInLines(listing({ pricePeriod: "month" }), copy), "rent").basis).toBe("monthly");
    expect(line(moveInLines(listing({ pricePeriod: "year" }), copy), "rent").basis).toBe("yearly");
    /* A nightly rate is not a tenancy rent; the line falls back to the yearly
       label rather than inventing a period the column does not hold. */
    expect(line(moveInLines(listing({ pricePeriod: "night" }), copy), "rent").basis).toBe("yearly");
  });

  it("states the service charge period only when the lister named one", () => {
    expect(line(moveInLines(listing({ serviceChargeMinor: 100 }), copy), "service").basis).toBeUndefined();
    expect(
      line(moveInLines(listing({ serviceChargeMinor: 100, serviceChargePeriod: "month" }), copy), "service")
        .basis,
    ).toBe("monthly");
  });

  it("treats a zero headline price as undeclared rather than as free rent", () => {
    expect(line(moveInLines(listing({ priceMinor: 0 }), copy), "rent").minor).toBeUndefined();
  });

  it("says who keeps each cost only from the money map, and never guesses (V-46)", () => {
    // No map, no caption: "Paid to the landlord" was a claim with no record.
    expect(moveInLines(listing({}), copy).every((row) => row.keeper === undefined)).toBe(true);
    const map = {
      ctx: { listerRole: "agent" as const, listerName: "Musa", mandateVerified: false, ownershipVerified: false },
      copy: getDictionary("en").afterTheGate.moneyMap,
    };
    const rows = moveInLines(listing({}), copy, map);
    expect(line(rows, "rent").keeper).toBe("Paid to Musa. No landlord is on record for this listing.");
    expect(line(rows, "agency").keeper).toBe("Kept by Musa");
    expect(line(rows, "service").keeper).toBe("Paid to Musa for the estate");
  });

  it("gives each row its own line glyph, never repeated in the block", () => {
    const glyphs = moveInLines(listing({}), copy).map((row) => row.glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    expect(glyphs).not.toContain("coins");
  });
});
