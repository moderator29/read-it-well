import { describe, expect, it } from "vitest";

import {
  headlinePeriod,
  headlinePrice,
  moveInParts,
  moveInTotal,
  PERIOD_NOUN,
  PERIOD_SUFFIX,
  PERIOD_SUFFIX_SHORT,
  PERIOD_SUFFIX_SLASH,
  RENT_PERIOD_VALUES,
  RATE_PERIOD_VALUES,
} from "./pricing";
import { submitRequirements, type SubmitSubject } from "../agent/listings-schema";

/**
 * The money resolution, tested because it is the one decision every price on
 * the platform passes through.
 *
 * A listings row carries three separate money stories and `headlinePrice`
 * decides which one it leads with. Get that wrong and a 180 million naira
 * asking price prints as a nightly rate, or a shortlet prints its annual rent.
 * Both of those existed before this module, because the answer was being
 * re-derived at four different call sites from a column called
 * price_per_night_minor that sometimes held annual rent.
 */

const bare = {
  listing_intent: "rent" as string | null,
  rent_amount_minor: null as number | null,
  rent_period: null as string | null,
  rate_minor: null as number | null,
  rate_period: null as string | null,
  sale_price_minor: null as number | null,
};

describe("headlinePrice", () => {
  it("leads a sale with its asking price, and calls it a sale", () => {
    const headline = headlinePrice({
      ...bare,
      listing_intent: "sale",
      sale_price_minor: 18_000_000_000,
      // A sale row can legitimately still carry a rent from before somebody
      // changed their mind, and it must not win.
      rent_amount_minor: 450_000_000,
      rent_period: "year",
    });
    expect(headline).toEqual({ kind: "sale", minor: 18_000_000_000 });
    expect(headlinePeriod(headline)).toBe("sale");
  });

  it("leads a shortlet with its nightly rate even when a rent is also set", () => {
    // A flat let by the night that the owner would also let annually. The
    // nightly figure is what a shortlet card means.
    const headline = headlinePrice({
      ...bare,
      rate_minor: 8_500_000,
      rate_period: "night",
      rent_amount_minor: 450_000_000,
      rent_period: "year",
    });
    expect(headline).toEqual({ kind: "rate", minor: 8_500_000, period: "night" });
  });

  it("leads a tenancy with its rent, in the cycle the lister stated", () => {
    expect(
      headlinePrice({ ...bare, rent_amount_minor: 30_000_000, rent_period: "month" }),
    ).toEqual({ kind: "rent", minor: 30_000_000, period: "month" });
  });

  it("prices a restaurant per head", () => {
    expect(headlinePrice({ ...bare, rate_minor: 1_500_000, rate_period: "guest" })).toEqual({
      kind: "rate",
      minor: 1_500_000,
      period: "guest",
    });
  });

  it("answers zero rather than null when nothing has been stated", () => {
    // A draft nobody has finished. Every reader needs a shape, not a null.
    expect(headlinePrice(bare)).toEqual({ kind: "rent", minor: 0, period: "year" });
  });

  it("treats a zero rate as unstated rather than as free", () => {
    expect(headlinePrice({ ...bare, rate_minor: 0, rent_amount_minor: 450_000_000, rent_period: "year" })).toEqual(
      { kind: "rent", minor: 450_000_000, period: "year" },
    );
  });
});

describe("moveInTotal", () => {
  const fees = {
    rent_amount_minor: 450_000_000,
    rent_period: "year",
    caution_deposit_minor: 45_000_000,
    service_charge_minor: null,
    service_charge_period: null,
    agency_fee_minor: 45_000_000,
    legal_fee_minor: null,
    agreement_fee_minor: null,
    total_move_in_cost_minor: null,
  };

  it("sums the stated parts when the lister named no total", () => {
    const total = moveInTotal(fees);
    expect(total).toEqual({ minor: 540_000_000, stated: false });
  });

  it("keeps the lister's own total rather than recomputing it", () => {
    // Agents fold fees into each other, so a stated total above the sum is
    // normal and a derived sum would invent a breakdown nobody quoted.
    const total = moveInTotal({ ...fees, total_move_in_cost_minor: 700_000_000 });
    expect(total).toEqual({ minor: 700_000_000, stated: true });
  });

  it("omits a fee nobody stated rather than printing it as zero", () => {
    const keys = moveInParts(fees).map((part) => part.key);
    expect(keys).toEqual(["rent", "caution", "agency"]);
    expect(keys).not.toContain("legal");
  });

  it("keeps a stated zero, because no agency fee is a selling point", () => {
    const keys = moveInParts({ ...fees, agency_fee_minor: 0 }).map((p) => p.key);
    expect(keys).toContain("agency");
    expect(moveInParts({ ...fees, agency_fee_minor: 0 }).find((p) => p.key === "agency")?.minor).toBe(0);
  });
});

describe("submitRequirements", () => {
  const ready: SubmitSubject = {
    title: "Three Bedroom Flat In Yaba",
    description: Array.from({ length: 45 }, (_, i) => `word${i}`).join(" "),
    propertyType: "rental",
    stateCode: "LA",
    city: "Lagos",
    area: "Yaba",
    intent: "rent",
    rentMinor: 450_000_000,
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

  it("passes a complete tenancy", () => {
    expect(submitRequirements(ready)).toEqual([]);
  });

  it("refuses a tenancy with no rent, and names the rent field", () => {
    const unmet = submitRequirements({ ...ready, rentMinor: 0 });
    expect(unmet.map((u) => u.field)).toContain("rent");
  });

  it("refuses a sale with no title deed", () => {
    // A property for sale with no stated title is the shape of every land scam
    // there has ever been, so the gate treats it as missing information.
    const unmet = submitRequirements({
      ...ready,
      intent: "sale",
      salePriceMinor: 18_000_000_000,
      tenure: null,
    });
    expect(unmet.map((u) => u.field)).toEqual(["tenure"]);
  });

  it("passes a sale that states its price and its title", () => {
    expect(
      submitRequirements({
        ...ready,
        intent: "sale",
        salePriceMinor: 18_000_000_000,
        tenure: "certificate_of_occupancy",
      }),
    ).toEqual([]);
  });

  it("asks a shortlet for a nightly rate rather than a rent", () => {
    const unmet = submitRequirements({
      ...ready,
      propertyType: "shortlet",
      rentMinor: null,
      rentPeriod: null,
    });
    expect(unmet.map((u) => u.field)).toContain("rate");
  });

  it("never asks a plot of land for a bathroom", () => {
    const unmet = submitRequirements({ ...ready, propertyType: "land", bathrooms: 0 });
    expect(unmet.map((u) => u.field)).not.toContain("bathrooms");
  });
});

/**
 * The suffix maps, which are the words the platform puts after money.
 *
 * They earn a test because the failure they guard against is invisible in
 * review and expensive in the wild: a figure labelled with the wrong unit is
 * not a typo, it is the platform stating a different price. Two panels had it
 * wrong for exactly this reason - they carried their own hardcoded string
 * instead of reading a map, so a monthly rental printed "/ year" and an asking
 * price printed "/ year" underneath a hero that said "asking price".
 *
 * Every period must appear in every map. A missing key is `undefined` rendered
 * next to a number, which reads as no unit at all.
 */
describe("the period suffixes", () => {
  const everyPeriod = [...RENT_PERIOD_VALUES, ...RATE_PERIOD_VALUES];

  it("names every period in all three maps", () => {
    for (const period of everyPeriod) {
      expect(PERIOD_SUFFIX[period], `PERIOD_SUFFIX.${period}`).toBeTruthy();
      expect(PERIOD_SUFFIX_SHORT[period], `PERIOD_SUFFIX_SHORT.${period}`).toBeTruthy();
      expect(PERIOD_SUFFIX_SLASH[period], `PERIOD_SUFFIX_SLASH.${period}`).toBeTruthy();
    }
  });

  it("carries a sale in the two maps that can express one, and not in the third", () => {
    expect(PERIOD_SUFFIX.sale).toBe("asking price");
    // An asking price divided by nothing has no unit to follow a slash, so the
    // slash map deliberately has no "sale" key at all rather than an empty one
    // that would render as a bare "/".
    expect("sale" in PERIOD_SUFFIX_SLASH).toBe(false);
  });

  it("spells the slash suffixes the way the booking panels print them", () => {
    // Pinned rather than derived: `bookings.spec.mjs` asserts the panel text
    // contains "/ night" and `listing-detail.spec.mjs` accepts "/ year", so
    // these exact strings are load-bearing outside this module.
    expect(PERIOD_SUFFIX_SLASH.night).toBe("/ night");
    expect(PERIOD_SUFFIX_SLASH.year).toBe("/ year");
    expect(PERIOD_SUFFIX_SLASH.month).toBe("/ month");
    expect(PERIOD_SUFFIX_SLASH.quarter).toBe("/ quarter");
  });

  it("gives every rent period a singular noun the tenancy control can count", () => {
    for (const period of RENT_PERIOD_VALUES) {
      const noun = PERIOD_NOUN[period];
      expect(noun, `PERIOD_NOUN.${period}`).toBeTruthy();
      // Singular, because the control appends the s. A plural here would read
      // "1 years" at the floor of the stepper, which is where it starts.
      expect(noun.endsWith("s"), `PERIOD_NOUN.${period} must be singular`).toBe(false);
    }
  });
});
