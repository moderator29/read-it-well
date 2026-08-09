import { describe, expect, it } from "vitest";

import { MAX_PINS, MAX_SPAN_DEGREES, pinCap, readBounds } from "./bounds";

/**
 * The box rules, which are the entire security surface of a public endpoint.
 *
 * `public.listings_in_bounds` is granted to `anon` and clamps its own row count
 * and nothing else. It cannot clamp the BOX, and the box is the exposure: a
 * rectangle covering Nigeria returns up to a thousand published listings with
 * their coordinates, unauthenticated, in one request. SEC-6 point 3 named that
 * before the function was wired up at all.
 *
 * `readBounds` is deliberately pure so this can be proved without a database
 * and without a request. Every case below is a request somebody will make.
 */

/** A believable Lagos viewport: Victoria Island through Lekki Phase 1. */
const LAGOS = { west: 3.38, south: 6.41, east: 3.52, north: 6.47 };

describe("readBounds", () => {
  it("accepts an ordinary city viewport unchanged", () => {
    const result = readBounds(LAGOS);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.bounds).toEqual(LAGOS);
  });

  it("refuses a corner that is missing, non-numeric or infinite", () => {
    for (const bad of [undefined, null, "3.4", NaN, Infinity, -Infinity, {}, []]) {
      const result = readBounds({ ...LAGOS, west: bad });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("unreachable");
      expect(result.reason).toBe("malformed");
    }
  });

  it("refuses coordinates that are not on earth", () => {
    expect(readBounds({ ...LAGOS, west: -181 })).toMatchObject({ reason: "malformed" });
    expect(readBounds({ ...LAGOS, east: 181 })).toMatchObject({ reason: "malformed" });
    expect(readBounds({ ...LAGOS, south: -91 })).toMatchObject({ reason: "malformed" });
    expect(readBounds({ ...LAGOS, north: 91 })).toMatchObject({ reason: "malformed" });
  });

  /**
   * A dragged selection, not an attack. Repairing it is right: refusing would
   * make the map appear broken to a reader who did nothing wrong, and passing
   * it through would produce an envelope that matches nothing, which is worse
   * because it looks like an answer.
   */
  it("repairs an inverted rectangle instead of refusing it", () => {
    const result = readBounds({
      west: LAGOS.east,
      east: LAGOS.west,
      south: LAGOS.north,
      north: LAGOS.south,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.bounds).toEqual(LAGOS);
  });

  /**
   * THE ONE THAT MATTERS. A box covering the country is a catalogue export.
   */
  it("refuses a box wider or taller than a viewport", () => {
    const wide = readBounds({ west: 3, south: 6.4, east: 3 + MAX_SPAN_DEGREES + 0.01, north: 6.5 });
    expect(wide).toMatchObject({ reason: "too-wide" });

    const tall = readBounds({ west: 3.4, south: 6, east: 3.5, north: 6 + MAX_SPAN_DEGREES + 0.01 });
    expect(tall).toMatchObject({ reason: "too-wide" });

    // The whole country, which is the request being defended against.
    expect(readBounds({ west: 2.6, south: 4.2, east: 14.7, north: 13.9 })).toMatchObject({
      reason: "too-wide",
    });
  });

  it("allows a box exactly at the span limit", () => {
    const result = readBounds({ west: 3, south: 6.4, east: 3 + MAX_SPAN_DEGREES, north: 6.5 });
    expect(result.ok).toBe(true);
  });

  /**
   * The span is judged on what the caller ASKED for, before clamping. If the
   * clamp ran first, "give me the whole country" would become a legal request
   * for the whole country, which is exactly the request being refused.
   */
  it("judges the span before clamping to Nigeria, not after", () => {
    const result = readBounds({ west: -40, south: 6.4, east: 40, north: 6.5 });
    expect(result).toMatchObject({ reason: "too-wide" });
  });

  it("refuses a viewport that does not overlap Nigeria", () => {
    // Off the coast of Ghana, west of the country.
    expect(readBounds({ west: -1.2, south: 5.5, east: -1.0, north: 5.6 })).toMatchObject({
      reason: "out-of-range",
    });
    // The Sahara, north of it.
    expect(readBounds({ west: 8.0, south: 20.0, east: 8.2, north: 20.1 })).toMatchObject({
      reason: "out-of-range",
    });
  });

  it("clamps a viewport that straddles the border to the part inside it", () => {
    const result = readBounds({ west: 1.4, south: 6.2, east: 2.6, north: 6.4 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.bounds.west).toBeGreaterThanOrEqual(2.0);
    expect(result.bounds.east).toBe(2.6);
  });
});

describe("pinCap", () => {
  it("defaults to the ceiling when nothing is asked for", () => {
    expect(pinCap(undefined)).toBe(MAX_PINS);
  });

  it("honours a smaller request", () => {
    expect(pinCap(50)).toBe(50);
  });

  it("never lets a caller raise the ceiling", () => {
    expect(pinCap(MAX_PINS + 1)).toBe(MAX_PINS);
    expect(pinCap(100_000)).toBe(MAX_PINS);
  });

  /**
   * A nonsense number produces an ordinary page rather than an empty map. The
   * failure mode of a bad parameter should never be a surface that looks like
   * "there is nothing here".
   */
  it("falls back to the ceiling on nonsense rather than to nothing", () => {
    expect(pinCap(0)).toBe(MAX_PINS);
    expect(pinCap(-5)).toBe(MAX_PINS);
    expect(pinCap(Number.NaN)).toBe(MAX_PINS);
    expect(pinCap(Number.POSITIVE_INFINITY)).toBe(MAX_PINS);
  });

  it("floors a fractional request", () => {
    expect(pinCap(12.9)).toBe(12);
  });
});
