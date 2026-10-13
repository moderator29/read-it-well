import { describe, expect, it } from "vitest";
import { submitRequirements, type SubmitSubject } from "./listings-model";

/**
 * V-13. The quality gate refuses a stated move-in total the named parts do
 * not explain, because that gap is the hidden fee rebuilt inside the most
 * honest screen in the product. The wizard and `submitListing` both call
 * this function, so the refusal is the same on the page and on the server.
 */
const ready: SubmitSubject = {
  title: "Three Bedroom Flat In Yaba",
  description: Array.from({ length: 45 }, (_, i) => `word${i}`).join(" "),
  propertyType: "rental",
  stateCode: "LA",
  city: "Lagos",
  area: "Yaba",
  intent: "rent",
  rentMinor: 300_000_000,
  rentPeriod: "year",
  rateMinor: null,
  ratePeriod: null,
  salePriceMinor: null,
  tenure: null,
  bedrooms: 3,
  bathrooms: 2,
  amenityCount: 3,
  photoCount: 4,
  hasCover: true,
};
const parts = [300_000_000, 30_000_000, null, 30_000_000, 15_000_000, null];

describe("the unexplained remainder gate", () => {
  it("passes a listing with no stated total", () => {
    expect(submitRequirements({ ...ready, moveInStatedMinor: null, moveInPartsMinor: parts })).toEqual([]);
  });

  it("passes a stated total the parts explain exactly", () => {
    expect(submitRequirements({ ...ready, moveInStatedMinor: 375_000_000, moveInPartsMinor: parts })).toEqual([]);
  });

  it("refuses a stated total with ₦150,000 nobody itemised", () => {
    const unmet = submitRequirements({ ...ready, moveInStatedMinor: 390_000_000, moveInPartsMinor: parts });
    expect(unmet.map((item) => item.field)).toEqual(["totalMoveIn"]);
  });

  it("leaves a caller that does not pass the new fields exactly as it was", () => {
    expect(submitRequirements(ready)).toEqual([]);
  });

  it("does not apply to a sale", () => {
    const sale = { ...ready, intent: "sale" as const, salePriceMinor: 1, tenure: "freehold" as const };
    expect(submitRequirements({ ...sale, moveInStatedMinor: 390_000_000, moveInPartsMinor: parts })).toEqual([]);
  });
});
