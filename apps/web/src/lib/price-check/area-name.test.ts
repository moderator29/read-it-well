import { describe, expect, it } from "vitest";
import { isHeldAreaName, looksLikeAnAddress, safeAreaName } from "./area-name";
import { shareLines } from "./share-card";
import type { AreaShare } from "./types";

/**
 * THE SHARE RULE, ATTACKED FROM THE READ SIDE.
 *
 * The database walls are real and they are tested by
 * `scripts/probes/price_check_share_cannot_carry_an_address.sql` against the
 * live project. What no probe of that shape can test is a row that is ALREADY
 * STORED: a check constraint runs once, on the way in, against whatever it
 * said that day. The address guard on this column has already been rewritten
 * once and the rewrite LOOSENED it, so "a row passed the constraint" and "a
 * row passes today's constraint" are different statements about the same row.
 *
 * These tests are the renderer asking again.
 */

const COPY = {
  headline: "{bedrooms} bedroom {type} in {area}",
  headlineNoBedrooms: "{type} in {area}",
  headlineStudio: "Studio {type} in {area}",
  range: "Asking {low} to {high} {period}",
  perYear: "a year",
  perProperty: "for a property like this",
  basis: "Based on {count} Vallo listings, {month}",
  basisNoDate: "Based on {count} Vallo listings",
  typeNames: { apartment: "flats", home: "houses", any: "Properties" },
};

function row(area: string | null): AreaShare {
  return {
    id: "00000000-0000-4000-8000-00000000cafe",
    scope: "area_and_type",
    stateCode: "LA",
    lgaCode: null,
    area,
    propertyType: "apartment",
    listingIntent: "rent",
    bedrooms: 3,
    lowMinor: 750_000_000,
    midMinor: 820_000_000,
    highMinor: 900_000_000,
    listingCount: 9,
    oldestAt: null,
    newestAt: null,
    createdAt: "2026-09-23T10:00:00.000Z",
  } as AreaShare;
}

describe("what has the shape of an address rather than a place", () => {
  it("refuses a leading house number, with and without No.", () => {
    expect(looksLikeAnAddress("No. 14 Bourdillon")).toBe(true);
    expect(looksLikeAnAddress("No 14 Bourdillon")).toBe(true);
    expect(looksLikeAnAddress("Number 14 Bourdillon")).toBe(true);
  });

  it("refuses a number followed by a street word, anywhere in the string", () => {
    expect(looksLikeAnAddress("14 Bourdillon Road")).toBe(true);
    expect(looksLikeAnAddress("Flat 3, 27 Glover Court")).toBe(true);
    expect(looksLikeAnAddress("1A Karimu Kotun Street")).toBe(true);
  });

  it("does NOT refuse a neighbourhood whose name carries digits", () => {
    /* The first version of the database guard refused these three under a
       comment saying it did not, and 20260922223118 is the migration that
       found out. Refusing a real neighbourhood is its own kind of dishonesty. */
    expect(looksLikeAnAddress("1004 Estate")).toBe(false);
    expect(looksLikeAnAddress("Lekki Phase 1")).toBe(false);
    expect(looksLikeAnAddress("Phase 2")).toBe(false);
    expect(looksLikeAnAddress("Victoria Island")).toBe(false);
  });

  it("treats null, undefined and blank as no name rather than an address", () => {
    expect(looksLikeAnAddress(null)).toBe(false);
    expect(looksLikeAnAddress("   ")).toBe(false);
    expect(safeAreaName(null)).toBeNull();
    expect(safeAreaName("   ")).toBeNull();
  });
});

describe("a card built from a row that was stored before today's guard", () => {
  it("prints the state, not the address, when the stored area reads like one", () => {
    const lines = shareLines(row("14 Bourdillon Road"), COPY, "en", "Lagos");
    expect(lines.headline).toBe("3 bedroom flats in Lagos");
    expect(lines.headline).not.toContain("Bourdillon");
    expect(lines.headline).not.toContain("14");
  });

  it("prints the state for a blank area rather than a gap in the sentence", () => {
    expect(shareLines(row("  "), COPY, "en", "Lagos").headline).toBe("3 bedroom flats in Lagos");
  });

  it("still prints a real neighbourhood, which is the whole point of the card", () => {
    expect(shareLines(row("Lekki Phase 1"), COPY, "en", "Lagos").headline).toBe(
      "3 bedroom flats in Lekki Phase 1",
    );
    /* Rule 10: an estate is not on the closed neighbourhood list, so the
       card says the state. */
    expect(shareLines(row("1004 Estate"), COPY, "en", "Lagos").headline).toBe(
      "3 bedroom flats in Lagos",
    );
    /* Free text in a stored row prints the state, whatever its shape. */
    expect(shareLines(row("Chief Ade's compound"), COPY, "en", "Lagos").headline).toBe(
      "3 bedroom flats in Lagos",
    );
  });

  it("never lets an address reach the range, the basis or the footer either", () => {
    const lines = shareLines(row("No. 14 Bourdillon"), COPY, "en", "Lagos");
    for (const line of [lines.headline, lines.range, lines.basis, lines.footer]) {
      expect(line).not.toContain("Bourdillon");
    }
  });
});

describe("the vocabulary check, which is what closes the free text route", () => {
  const held = ["Lekki Phase 1", "Victoria Island", "1004 Estate"];

  it("accepts a name we hold, ignoring case and surrounding space", () => {
    expect(isHeldAreaName("Lekki Phase 1", held)).toBe(true);
    expect(isHeldAreaName("  lekki phase 1  ", held)).toBe(true);
  });

  it("refuses a name we do not hold, which is where an address would arrive", () => {
    expect(isHeldAreaName("14 Bourdillon", held)).toBe(false);
    expect(isHeldAreaName("Ikoyi", held)).toBe(false);
  });

  it("refuses a string that merely CONTAINS one we hold", () => {
    /* A substring match would admit "14 Bourdillon, Victoria Island" on the
       strength of the second half, which is the exact thing this refuses. */
    expect(isHeldAreaName("14 Bourdillon, Victoria Island", held)).toBe(false);
    expect(isHeldAreaName("Victoria Island Annexe", held)).toBe(false);
  });

  it("refuses an empty candidate and an empty vocabulary, so it fails closed", () => {
    expect(isHeldAreaName("", held)).toBe(false);
    expect(isHeldAreaName("Lekki Phase 1", [])).toBe(false);
  });
});
