import { describe, expect, it } from "vitest";

import { STAY_FACILITIES, STAY_FACILITY_CODES, orderFacilities } from "./facilities";
import { accommodationFacilitiesSchema } from "./schema";

const UUID = "00000000-0000-4000-8000-000000000001";

/**
 * WHAT A STAY OFFERS, AND THE ONE WAY THIS GOES WRONG SILENTLY.
 *
 * `accommodation_amenities` joins `amenities` by id, so a code the table does
 * not carry is simply not found and nothing is written: a host ticks a box,
 * nothing is refused, and nothing is saved. The property wizard shipped with
 * exactly that defect, three codes in the interface and none in the table, and
 * these tests exist so this spine does not repeat it.
 */
describe("the stay facilities list", () => {
  it("offers no code twice", () => {
    expect(new Set(STAY_FACILITY_CODES).size).toBe(STAY_FACILITY_CODES.length);
  });

  it("is the list the seed migrations actually carry", () => {
    /* From `20260728152229_listings_core.sql` and C1's
       `20260922150000_c1_three_amenities...`. Held here as a literal rather
       than read from the database, so a code added to the picker without a row
       behind it fails in CI instead of on a host's screen. */
    const seeded = new Set([
      "wifi",
      "ac",
      "tv",
      "kitchen",
      "parking",
      "pool",
      "gym",
      "security",
      "elevator",
      "furnished",
      "balcony",
      "garden",
      "laundry",
      "generator",
      "water",
      "shower",
      "breakfast",
      "workspace",
    ]);
    for (const code of STAY_FACILITY_CODES) expect(seeded.has(code)).toBe(true);
  });

  it("carries the three the stays filter names by itself", () => {
    /* `staysParamsSchema` has `wifi`, `parking` and `ac` as flags of their
       own, so a stay that cannot claim them cannot answer those filters. */
    for (const code of ["wifi", "parking", "ac"]) {
      expect(STAY_FACILITY_CODES).toContain(code);
    }
  });

  it("gives every facility a label and a mark", () => {
    for (const facility of STAY_FACILITIES) {
      expect(facility.label.length).toBeGreaterThan(1);
      expect(facility.mark.length).toBeGreaterThan(1);
    }
  });
});

describe("orderFacilities", () => {
  it("returns the list's own order, not the order they were tapped", () => {
    expect(orderFacilities(["ac", "pool", "wifi"])).toEqual(["pool", "wifi", "ac"]);
  });

  it("drops anything it does not know rather than passing it on", () => {
    expect(orderFacilities(["pool", "helipad"])).toEqual(["pool"]);
  });

  it("treats none as a real answer", () => {
    expect(orderFacilities([])).toEqual([]);
  });
});

describe("accommodationFacilitiesSchema", () => {
  it("accepts an empty set, because claiming nothing is an answer", () => {
    expect(
      accommodationFacilitiesSchema.safeParse({ accommodationId: UUID, codes: [] }).success,
    ).toBe(true);
  });

  it("refuses a code the amenities table does not carry, in words", () => {
    const parsed = accommodationFacilitiesSchema.safeParse({
      accommodationId: UUID,
      codes: ["pool", "helipad"],
    });
    expect(parsed.success).toBe(false);
  });
});
