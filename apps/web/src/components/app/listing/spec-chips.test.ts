import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { RENTAL, SALE } from "@/app/(dev)/preview/f3/fixtures";
import type { Listing } from "@/lib/listings/types";
import { SPEC_CHIPS_VISIBLE, specChips, splitChips } from "./spec-chips";

/**
 * THE FACT CHIPS UNDER THE TITLE (founder's reference, 13 October 2026).
 *
 * Only real listing fields: a column nobody filled draws no chip, a stated
 * zero draws no chip, and the order is beds, baths, size, then the rest. Five
 * show; the rest wait behind "+N", except that a lone sixth is drawn rather
 * than hidden behind a "+1" the same width as itself.
 */
const t = getDictionary("en");

const bare: Listing = {
  ...RENTAL,
  bedrooms: 0,
  bathrooms: 0,
  sizeSqm: undefined,
  parkingSpaces: undefined,
  utilities: undefined,
  toilets: undefined,
  furnished: undefined,
  floor: undefined,
  condition: undefined,
  maxGuests: undefined,
};

describe("specChips: only what the lister stated", () => {
  it("draws nothing for a listing that stated nothing", () => {
    expect(specChips(bare, t, "en")).toEqual([]);
  });

  it("leads with beds, baths and size, in that order", () => {
    const keys = specChips(RENTAL, t, "en").map((chip) => chip.key);
    expect(keys.slice(0, 3)).toEqual(["beds", "baths", "size"]);
  });

  it("counts with countOf, so one bed is singular", () => {
    const [beds] = specChips({ ...bare, bedrooms: 1 }, t, "en");
    expect(beds?.label).toBe("1 bed");
  });

  it("draws no chip for a stated zero (no parking is not a chip)", () => {
    expect(specChips({ ...bare, parkingSpaces: 0 }, t, "en")).toEqual([]);
  });

  it("does not repeat toilets that equal the baths", () => {
    const keys = specChips({ ...bare, bathrooms: 2, toilets: 2 }, t, "en").map((c) => c.key);
    expect(keys).not.toContain("toilets");
    const more = specChips({ ...bare, bathrooms: 2, toilets: 3 }, t, "en").map((c) => c.key);
    expect(more).toContain("toilets");
  });

  it("names the furnishing, the floor and the build from the dictionary", () => {
    const chips = specChips({ ...bare, furnished: "fully_furnished", floor: 0, condition: "renovated" }, t, "en");
    expect(chips.map((c) => c.label)).toEqual(["Fully furnished", "Ground floor", "Renovated"]);
  });

  it("only offers guests on a nightly stay", () => {
    expect(specChips({ ...bare, maxGuests: 4, pricePeriod: "year" }, t, "en")).toEqual([]);
    expect(specChips({ ...bare, maxGuests: 4, pricePeriod: "night" }, t, "en").map((c) => c.key)).toEqual(["guests"]);
  });

  it("does not repeat parking or backup power the amenity row already carries", () => {
    const stated = { ...bare, parkingSpaces: 2, utilities: { powerBackup: "GENERATOR" as const, hasEstateAccess: false } };
    expect(specChips({ ...stated, amenities: [] }, t, "en").map((c) => c.key)).toEqual(["parking", "power"]);
    expect(specChips({ ...stated, amenities: ["parking", "generator"] }, t, "en")).toEqual([]);
  });

  it("works for a sale", () => {
    expect(specChips(SALE, t, "en").length).toBeGreaterThan(0);
  });
});

describe("splitChips: five, then +N", () => {
  const chips = (n: number) => Array.from({ length: n }, (_, i) => ({ key: `k${i}`, icon: "bed" as const, label: `L${i}` }));

  it("shows them all when there are five", () => {
    expect(splitChips(chips(5))).toEqual({ shown: chips(5), hidden: [] });
  });

  it("draws a lone sixth rather than a +1", () => {
    expect(splitChips(chips(6)).hidden).toEqual([]);
  });

  it("hides the rest behind +N from seven", () => {
    const { shown, hidden } = splitChips(chips(9));
    expect(shown).toHaveLength(SPEC_CHIPS_VISIBLE);
    expect(hidden.map((c) => c.key)).toEqual(["k5", "k6", "k7", "k8"]);
  });
});
