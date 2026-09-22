import { describe, expect, it } from "vitest";
import { emptySubject } from "./address";
import {
  MINIMUM_COMPARABLES,
  RADIUS_LADDER,
  RECENCY_DAYS,
  SUPPORTED_TYPES,
  WIDE_DISPERSION_AT,
  isSupportedType,
  priceCheckOutcome,
} from "./gate";
import { REFUSALS, REFUSAL_CODES, offersNotifyMe } from "./refusals";
import type { GateVerdict, PriceCheckSubject, SupplyCensus } from "./types";

/**
 * THE GATE'S PRODUCT HALF, AND THE REFUSAL IS WHAT IS BEING TESTED.
 *
 * `scripts/probes/price_check_stage_one.sql` proves the DATABASE half against
 * the live estate: that six real comparables answer, that the ladder opens a
 * rung, that the range is the actual interquartile range. This file proves the
 * half that decides WHICH REFUSAL a reader sees, which is the half that is the
 * product for as long as the gate refuses everything, and which no SQL probe
 * can reach because the copy and the next action live here.
 *
 * The case that matters most is `demo_only`. It is indistinguishable from
 * `no_comparables` from inside the RPC, because `is_demo = false` is in the
 * comparables predicate, and it is the state 100 per cent of checks are in
 * today. Getting it wrong would print "we have nothing published near here" to
 * a reader standing in a neighbourhood full of our own example listings.
 */

function answered(over: Partial<GateVerdict> = {}): GateVerdict {
  return {
    outcome: "answered",
    refusalCode: null,
    radiusM: 750,
    comparableCount: 9,
    basis: "per_property",
    lowMinor: 770_000_000,
    midMinor: 800_000_000,
    highMinor: 830_000_000,
    dispersion: 0.075,
    confidence: "medium",
    medianAgeDays: 60,
    medianDistanceM: 420,
    comparableIds: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    ...over,
  };
}

function refused(over: Partial<GateVerdict> = {}): GateVerdict {
  return {
    outcome: "refused",
    refusalCode: "no_comparables",
    radiusM: 3000,
    comparableCount: 0,
    basis: null,
    lowMinor: null,
    midMinor: null,
    highMinor: null,
    dispersion: null,
    confidence: null,
    medianAgeDays: null,
    medianDistanceM: null,
    comparableIds: [],
    ...over,
  };
}

function subject(over: Partial<PriceCheckSubject> = {}): PriceCheckSubject {
  return {
    ...emptySubject("LA"),
    lat: 6.44,
    lng: 3.42,
    bedrooms: 3,
    ...over,
  };
}

const NOTHING: SupplyCensus = { realCount: 0, demoCount: 0, staleRealCount: 0 };
const EXAMPLES_ONLY: SupplyCensus = { realCount: 0, demoCount: 11, staleRealCount: 0 };

describe("the numbers are floors, not settings", () => {
  it("keeps the five, the ladder and the windows the research argued for", () => {
    expect(MINIMUM_COMPARABLES).toBe(5);
    expect([...RADIUS_LADDER]).toEqual([750, 1500, 3000]);
    expect(RECENCY_DAYS).toBe(365);
    expect(WIDE_DISPERSION_AT).toBe(0.75);
  });

  it("answers for four property types and no more", () => {
    expect([...SUPPORTED_TYPES]).toEqual(["apartment", "home", "shop", "office"]);
    for (const type of ["land", "hotel", "restaurant", "shortlet", "villa", "rental"] as const) {
      expect(isSupportedType(type)).toBe(false);
    }
  });
});

describe("what was asked is refused before what we hold is looked at", () => {
  it("refuses land whatever the database would have said", () => {
    const result = priceCheckOutcome(
      subject({ propertyType: "land" }),
      answered(),
      { realCount: 40, demoCount: 0, staleRealCount: 0 },
    );
    expect(result).toMatchObject({ kind: "refused", code: "unsupported_type" });
  });

  it("refuses a monthly let rather than multiplying it by twelve", () => {
    const result = priceCheckOutcome(subject({ rentPeriod: "month" }), answered(), NOTHING);
    expect(result).toMatchObject({ kind: "refused", code: "unsupported_period" });
  });

  it("leaves a monthly SALE alone, because a sale has no period", () => {
    const result = priceCheckOutcome(
      subject({ intent: "sale", rentPeriod: "month" }),
      answered(),
      NOTHING,
    );
    expect(result.kind).toBe("answered");
  });

  it("puts the unsupported type ahead of the unsupported period, because one of them can be changed", () => {
    /* A monthly let of a plot of land is two true refusals. The type is the
       one no edit of this form fixes, so it is the one that is printed. */
    const result = priceCheckOutcome(
      subject({ propertyType: "land", rentPeriod: "month" }),
      null,
      NOTHING,
    );
    expect(result).toMatchObject({ code: "unsupported_type" });
  });
});

describe("no pin, no per property check", () => {
  it("refuses with no_location rather than calling the database", () => {
    const result = priceCheckOutcome(subject({ lat: null, lng: null }), null, null);
    expect(result).toMatchObject({ kind: "refused", code: "no_location" });
  });

  it("refuses with no_location when the pin is there but the verdict is not", () => {
    expect(priceCheckOutcome(subject(), null, NOTHING)).toMatchObject({ code: "no_location" });
  });
});

describe("demo_only, which is the state the whole product is in today", () => {
  it("is told apart from no_comparables by the census and nothing else", () => {
    /* The RPC returns exactly the same verdict in both cases. The only thing
       that differs is the census, and reading it is the difference between a
       true sentence and a guess. */
    const verdict = refused();
    expect(priceCheckOutcome(subject(), verdict, EXAMPLES_ONLY)).toMatchObject({
      code: "demo_only",
    });
    expect(priceCheckOutcome(subject(), verdict, NOTHING)).toMatchObject({
      code: "no_comparables",
    });
  });

  it("falls back to no_comparables rather than guessing when there is no census", () => {
    expect(priceCheckOutcome(subject(), refused(), null)).toMatchObject({
      code: "no_comparables",
    });
  });

  it("is not claimed where real listings also exist", () => {
    const mixed: SupplyCensus = { realCount: 2, demoCount: 11, staleRealCount: 0 };
    expect(priceCheckOutcome(subject(), refused({ comparableCount: 2 }), mixed)).toMatchObject({
      code: "too_few_comparables",
    });
  });
});

describe("the counts a refusal prints are counted, never rounded", () => {
  it("carries the number we actually found into too_few_comparables", () => {
    const result = priceCheckOutcome(
      subject(),
      refused({ refusalCode: "too_few_comparables", comparableCount: 3 }),
      { realCount: 3, demoCount: 0, staleRealCount: 0 },
    );
    expect(result).toMatchObject({ code: "too_few_comparables", comparableCount: 3 });
  });

  it("tells a year old market apart from an empty one", () => {
    const result = priceCheckOutcome(subject(), refused(), {
      realCount: 0,
      demoCount: 0,
      staleRealCount: 6,
    });
    expect(result).toMatchObject({ code: "stale" });
  });
});

describe("a figure the gate was willing to give, withheld anyway", () => {
  it("refuses a market that disagrees with itself, and keeps the spread to show it", () => {
    const result = priceCheckOutcome(subject(), answered({ dispersion: 0.9 }), NOTHING);
    expect(result).toMatchObject({ kind: "refused", code: "wide_dispersion", dispersion: 0.9 });
    expect(REFUSALS.wide_dispersion.showsStripPlot).toBe(true);
  });

  it("answers at the threshold and refuses just past it", () => {
    expect(priceCheckOutcome(subject(), answered({ dispersion: 0.75 }), NOTHING).kind).toBe(
      "answered",
    );
    expect(priceCheckOutcome(subject(), answered({ dispersion: 0.7501 }), NOTHING).kind).toBe(
      "refused",
    );
  });

  it("refuses a year old median rather than repeating an old figure", () => {
    expect(priceCheckOutcome(subject(), answered({ medianAgeDays: 400 }), NOTHING)).toMatchObject({
      code: "stale",
    });
    expect(priceCheckOutcome(subject(), answered({ medianAgeDays: 365 }), NOTHING).kind).toBe(
      "answered",
    );
  });

  it("refuses rather than printing a zero when the gate answered without a number", () => {
    /* Not a state the RPC has. It is asserted because a null quietly rendered
       as a zero is the invented figure this whole feature exists to refuse. */
    const result = priceCheckOutcome(subject(), answered({ midMinor: null }), NOTHING);
    expect(result.kind).toBe("refused");
  });
});

describe("the answered result", () => {
  it("carries the range, the spread, the band and the set it came from", () => {
    const result = priceCheckOutcome(subject(), answered(), NOTHING);
    expect(result).toMatchObject({
      kind: "answered",
      lowMinor: 770_000_000,
      midMinor: 800_000_000,
      highMinor: 830_000_000,
      confidence: "medium",
      comparableCount: 9,
      radiusM: 750,
    });
  });

  it("flags the per square metre shortfall instead of hiding it", () => {
    /* The subject stated a size and the answer still came back per property,
       which means fewer than five comparables near here state one. The figure
       is honest; the price per square metre is not available, and the screen
       says so rather than quietly leaving it out. */
    const withSize = priceCheckOutcome(subject({ sizeSqm: 120 }), answered(), NOTHING);
    expect(withSize).toMatchObject({ kind: "answered", sizedShortfall: true });

    const noSize = priceCheckOutcome(subject(), answered(), NOTHING);
    expect(noSize).toMatchObject({ sizedShortfall: false });

    const onSqm = priceCheckOutcome(
      subject({ sizeSqm: 120 }),
      answered({ basis: "per_sqm" }),
      NOTHING,
    );
    expect(onSqm).toMatchObject({ sizedShortfall: false });
  });

  it("never carries a figure on a refusal", () => {
    const result = priceCheckOutcome(subject(), refused(), EXAMPLES_ONLY);
    expect(result.kind).toBe("refused");
    expect(Object.keys(result)).not.toContain("midMinor");
  });
});

describe("every refusal is a complete screen", () => {
  it("has a spec, an icon and at least one next action", () => {
    for (const code of REFUSAL_CODES) {
      const spec = REFUSALS[code];
      expect(spec.code, `${code} is filed under the wrong key`).toBe(code);
      expect(spec.icon.length).toBeGreaterThan(0);
      expect(spec.actions.length, `${code} leaves the reader nowhere to go`).toBeGreaterThan(0);
    }
  });

  it("offers notify me exactly where more listings would change the answer", () => {
    for (const code of ["no_comparables", "too_few_comparables", "stale", "demo_only"] as const) {
      expect(offersNotifyMe(code), `${code} should offer notify me`).toBe(true);
    }
    /* And not where it would be a promise we could not keep by recruiting
       supply: an unsupported type stays unsupported, a monthly let stays
       monthly, a missing pin is the reader's own next tap, and a market that
       disagrees with itself does so at any density. */
    for (const code of [
      "unsupported_type",
      "unsupported_period",
      "no_location",
      "wide_dispersion",
    ] as const) {
      expect(offersNotifyMe(code), `${code} should not offer notify me`).toBe(false);
    }
  });

  it("never draws a strip plot and a comparables list at once", () => {
    for (const code of REFUSAL_CODES) {
      const spec = REFUSALS[code];
      expect(spec.showsComparables && spec.showsStripPlot, `${code} draws the set twice`).toBe(
        false,
      );
    }
  });
});
