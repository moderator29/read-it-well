import { describe, expect, it } from "vitest";
import { priceCheckOutcome } from "./gate";
import {
  areaRowFromRow,
  asCount,
  asNullableNumber,
  comparableFromRow,
  supplyFromRow,
  utilityFactsFromRow,
  verdictFromRow,
} from "./mapping";
import { emptySubject } from "./address";

/**
 * THE PAYLOAD POSTGREST ACTUALLY SENDS, NOT THE ONE THE TYPES DESCRIBE.
 *
 * ---------------------------------------------------------------------------
 * EVERY MONEY COLUMN IN THIS FEATURE IS A bigint, AND JSON HAS NO 64-BIT INT.
 *
 * PostgREST therefore sends `low_minor`, `mid_minor`, `high_minor` and
 * `price_minor` as JSON STRINGS, so that a figure above 2^53 is not silently
 * rounded on the way out. Reading one straight into a number field gives a
 * string, and a string reaching `Amount` renders NaN or the literal
 * characters, on the screen that prints somebody's money.
 *
 * ---------------------------------------------------------------------------
 * AND IT WOULD BE INVISIBLE ON THIS PLATFORM TODAY.
 *
 * Exactly the same reason the SQL fault in
 * `20260922223411_estimate_value_threw_on_every_answered_call...` was
 * invisible: 64 of the 64 listings here are examples, `is_demo = false` is in
 * the comparables predicate, and the gate refuses every call. The branch that
 * carries a figure is never taken, so nothing in the product, no screenshot
 * and no smoke test can see a fault in it until the fifth real listing lands
 * in one area.
 *
 * Twice in one day is a pattern rather than a coincidence, and it is the
 * pattern this file exists for: the code paths this feature cannot reach are
 * the ones that most need a test, precisely because nothing else can look at
 * them.
 */

/** An answered row, in the shape PostgREST sends it: bigints as strings. */
const ANSWERED = {
  outcome: "answered",
  refusal_code: null,
  radius_m: 1500,
  comparable_count: 6,
  basis: "per_property",
  low_minor: "225000000",
  mid_minor: "350000000",
  high_minor: "475000000",
  dispersion: "0.7143",
  confidence: "low",
  median_age_days: 30,
  median_distance_m: 611,
  comparable_ids: ["a", "b", "c", "d", "e", "f"],
};

describe("a bigint arrives as a string", () => {
  it("reads the three money columns as numbers, not as strings", () => {
    const verdict = verdictFromRow(ANSWERED)!;
    expect(verdict.lowMinor).toBe(225_000_000);
    expect(verdict.midMinor).toBe(350_000_000);
    expect(verdict.highMinor).toBe(475_000_000);
    /* The assertion that would have caught the whole class: a string here
       renders NaN on a screen about somebody's money. */
    expect(typeof verdict.lowMinor).toBe("number");
  });

  it("reads the numeric dispersion the same way", () => {
    expect(verdictFromRow(ANSWERED)!.dispersion).toBeCloseTo(0.7143, 4);
  });

  it("carries the whole verdict through to an answered result", () => {
    const result = priceCheckOutcome(
      { ...emptySubject("LA"), lat: 6.44, lng: 3.42, bedrooms: 3 },
      verdictFromRow(ANSWERED),
      { realCount: 6, demoCount: 0, staleRealCount: 0 },
    );
    expect(result).toMatchObject({
      kind: "answered",
      lowMinor: 225_000_000,
      highMinor: 475_000_000,
      comparableCount: 6,
      radiusM: 1500,
      confidence: "low",
    });
  });

  it("reads a comparable's price as a number", () => {
    const comparable = comparableFromRow({
      id: "x",
      title: "A flat",
      area: "Yaba",
      city: "Lagos",
      bedrooms: 3,
      bathrooms: 2,
      size_sqm: "120.50",
      published_at: "2026-08-01T00:00:00Z",
      age_days: 52,
      distance_m: 411.2,
      price_minor: "180000000",
      price_basis: "advertised_rent_year",
      price_per_sqm_minor: "1493776.08",
    });
    expect(comparable.priceMinor).toBe(180_000_000);
    expect(comparable.sizeSqm).toBe(120.5);
    expect(comparable.pricePerSqmMinor).toBeCloseTo(1_493_776.08, 2);
  });

  it("reads the area report's quartiles as numbers", () => {
    const row = areaRowFromRow({
      scope: "area",
      property_type: "apartment",
      bedrooms: 3,
      listing_count: 12,
      p25_minor: "770000000",
      median_minor: "800000000",
      p75_minor: "950000000",
      sized_count: 2,
      median_per_sqm_minor: null,
      oldest_at: "2026-02-11T00:00:00Z",
      newest_at: "2026-09-02T00:00:00Z",
    });
    expect(row.p25Minor).toBe(770_000_000);
    expect(row.p75Minor).toBe(950_000_000);
    expect(row.medianPerSqmMinor).toBeNull();
  });
});

describe("a missing value never becomes a number", () => {
  it("keeps a null figure null, so the gate refuses rather than printing zero", () => {
    const verdict = verdictFromRow({ ...ANSWERED, mid_minor: null })!;
    expect(verdict.midMinor).toBeNull();
    const result = priceCheckOutcome(
      { ...emptySubject("LA"), lat: 6.44, lng: 3.42, bedrooms: 3 },
      verdict,
      null,
    );
    /* A zero naira asking price is an invented figure, which is the exact
       shape rule 15 forbids. Refusing is the only honest answer. */
    expect(result.kind).toBe("refused");
  });

  it("refuses a figure that is not a number at all", () => {
    expect(asNullableNumber("not a number")).toBeNull();
    expect(asNullableNumber("")).toBeNull();
    expect(asNullableNumber(undefined)).toBeNull();
    expect(asNullableNumber(Number.NaN)).toBeNull();
    expect(asNullableNumber({})).toBeNull();
  });

  it("treats a missing COUNT as zero, which is a true statement about our data", () => {
    /* The asymmetry is deliberate. "We found no comparables" is true and
       printable; "this property is asking zero naira" is neither. */
    expect(asCount(undefined)).toBe(0);
    expect(asCount("7")).toBe(7);
  });
});

describe("a refused row keeps nothing it should not", () => {
  it("has no figures on it", () => {
    const verdict = verdictFromRow({
      outcome: "refused",
      refusal_code: "no_comparables",
      radius_m: 3000,
      comparable_count: 0,
      basis: null,
      low_minor: null,
      mid_minor: null,
      high_minor: null,
      dispersion: null,
      confidence: null,
      median_age_days: null,
      median_distance_m: null,
      comparable_ids: [],
    })!;
    expect(verdict.outcome).toBe("refused");
    expect(verdict.lowMinor).toBeNull();
    expect(verdict.basis).toBeNull();
    expect(verdict.comparableIds).toEqual([]);
  });

  it("refuses an unrecognised outcome rather than trusting it", () => {
    /* Anything that is not the literal "answered" is a refusal. A row whose
       outcome column has drifted must not open the figure branch. */
    expect(verdictFromRow({ ...ANSWERED, outcome: "ANSWERED" })!.outcome).toBe("refused");
    expect(verdictFromRow({ ...ANSWERED, outcome: "ok" })!.outcome).toBe("refused");
  });

  it("drops a confidence or a basis it does not recognise", () => {
    expect(verdictFromRow({ ...ANSWERED, confidence: "very high" })!.confidence).toBeNull();
    expect(verdictFromRow({ ...ANSWERED, basis: "per_bedroom" })!.basis).toBeNull();
  });

  it("returns an empty id list rather than a list of one wrong thing", () => {
    expect(verdictFromRow({ ...ANSWERED, comparable_ids: "{a,b,c}" })!.comparableIds).toEqual([]);
    expect(verdictFromRow({ ...ANSWERED, comparable_ids: null })!.comparableIds).toEqual([]);
  });

  it("returns null for no row at all, which means we could not ask", () => {
    expect(verdictFromRow(undefined)).toBeNull();
    expect(supplyFromRow(undefined)).toBeNull();
    expect(utilityFactsFromRow(undefined)).toBeNull();
  });
});

describe("the census, which is what tells demo_only from no_comparables", () => {
  it("reads all three counts", () => {
    expect(supplyFromRow({ real_count: 0, demo_count: "11", stale_real_count: 2 })).toEqual({
      realCount: 0,
      demoCount: 11,
      staleRealCount: 2,
    });
  });

  it("turns a real zero and an example non-zero into demo_only", () => {
    const result = priceCheckOutcome(
      { ...emptySubject("LA"), lat: 6.44, lng: 3.42, bedrooms: 3 },
      verdictFromRow({ ...ANSWERED, outcome: "refused", comparable_count: 0 }),
      supplyFromRow({ real_count: 0, demo_count: "11", stale_real_count: 0 }),
    );
    expect(result).toMatchObject({ code: "demo_only" });
  });
});

describe("the facts panel's counts", () => {
  it("keeps a boolean's denominator separate from the listing count", () => {
    const facts = utilityFactsFromRow({
      listing_count: 19,
      power_grid: "BAND_A",
      power_grid_count: 11,
      power_backup: null,
      power_backup_count: null,
      water_supply: "BOREHOLE",
      water_supply_count: 14,
      prepaid_meter_count: 4,
      prepaid_meter_known: 6,
      estate_access_count: 12,
      estate_access_known: 19,
    })!;
    /* "4 of 6 that said" and "4 of 19" are different facts and only the first
       is true of a column nobody is required to fill in. */
    expect(facts.prepaidMeterCount).toBe(4);
    expect(facts.prepaidMeterKnown).toBe(6);
    expect(facts.listingCount).toBe(19);
    expect(facts.powerBackup).toBeNull();
  });
});
