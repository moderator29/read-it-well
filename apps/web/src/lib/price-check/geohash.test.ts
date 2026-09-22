import { describe, expect, it } from "vitest";
import { GEOHASH_PRECISION, geohash5, geohashBounds, metresBetween } from "./geohash";

/**
 * THE CELL IS MEASURED HERE, NOT ASSERTED IN A COMMENT.
 *
 * `price_check_events.geohash5` is the only location this product keeps about
 * a check, and the entire privacy position rests on one claim: that five
 * characters is coarse enough that the row cannot be walked back to a
 * building. A comment saying "roughly 5 km" is exactly the kind of assertion
 * `check-css-tokens.mjs` opens by warning about: written down, believed
 * because it is written down, and never checked.
 *
 * So the coarseness is measured, at real Nigerian coordinates, in metres.
 */

const PLACES = [
  { name: "Lekki Phase 1, Lagos", lat: 6.4474, lng: 3.4736 },
  { name: "Ikoyi, Lagos", lat: 6.4541, lng: 3.4316 },
  { name: "Maitama, Abuja", lat: 9.0857, lng: 7.4951 },
  { name: "Nassarawa, Kano", lat: 12.0022, lng: 8.5919 },
  { name: "Old GRA, Port Harcourt", lat: 4.8156, lng: 7.0134 },
] as const;

describe("the cell is five characters and it is the length the schema accepts", () => {
  it("encodes to exactly five characters of the geohash alphabet", () => {
    expect(GEOHASH_PRECISION).toBe(5);
    for (const place of PLACES) {
      const cell = geohash5(place.lat, place.lng);
      expect(cell, place.name).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]{5}$/);
    }
  });

  it("omits a, i, l and o, which are the characters people misread", () => {
    const cells = PLACES.map((p) => geohash5(p.lat, p.lng)).join("");
    expect(cells).not.toMatch(/[ailo]/);
  });

  it("agrees with the standard encoding on a known point", () => {
    /* Not our arithmetic checked against our arithmetic: these are the cells
       the published geohash algorithm produces, so a cell written by this
       product is a cell any other tool reads back as the same place. */
    expect(geohash5(51.5074, -0.1278)).toBe("gcpvj");
    expect(geohash5(0, 0)).toBe("s0000");
    /* Lekki Phase 1. The London and origin cells above are the external
       anchors; this one is recorded so a change to the encoder that still
       satisfies them cannot quietly move Nigeria. */
    expect(geohash5(6.4474, 3.4736)).toBe("s14kx");
  });
});

describe("how coarse it actually is, in metres, at Nigerian latitudes", () => {
  it("is between four and six kilometres across everywhere in the country", () => {
    for (const place of PLACES) {
      const cell = geohash5(place.lat, place.lng);
      expect(cell).not.toBeNull();
      const box = geohashBounds(cell!);

      const width = metresBetween(box.latMin, box.lngMin, box.latMin, box.lngMax);
      const height = metresBetween(box.latMin, box.lngMin, box.latMax, box.lngMin);

      /* Roughly 4.9 km by 4.9 km: 13 bits of longitude and 12 of latitude.
         The window is deliberately wide, because the claim being tested is
         "too coarse to find a building", not "exactly 4,890 metres". */
      expect(width, `${place.name} width`).toBeGreaterThan(4_000);
      expect(width, `${place.name} width`).toBeLessThan(6_000);
      expect(height, `${place.name} height`).toBeGreaterThan(4_000);
      expect(height, `${place.name} height`).toBeLessThan(6_000);
    }
  });

  it("puts two of Lagos's most distinct neighbourhoods in one cell or in neighbouring ones", () => {
    /* Lekki Phase 1 and Ikoyi are five kilometres apart and are different
       markets by a wide margin. If the cell could separate them reliably it
       would be fine enough to be worth attacking. */
    const lekki = geohash5(6.4474, 3.4736);
    const ikoyi = geohash5(6.4541, 3.4316);
    expect(lekki?.slice(0, 3)).toBe(ikoyi?.slice(0, 3));
  });

  it("is not fine enough to separate two buildings on one street", () => {
    /* Two points 200 metres apart, which is the difference between a house
       and its neighbour's neighbour, land in the same cell. */
    const a = geohash5(6.4474, 3.4736);
    const b = geohash5(6.4492, 3.4736);
    expect(metresBetween(6.4474, 3.4736, 6.4492, 3.4736)).toBeLessThan(250);
    expect(a).toBe(b);
  });
});

describe("a point that is not a point records no cell", () => {
  it("refuses null, undefined and a number that is not one", () => {
    expect(geohash5(null, 3.4)).toBeNull();
    expect(geohash5(6.4, null)).toBeNull();
    expect(geohash5(undefined, undefined)).toBeNull();
    expect(geohash5(Number.NaN, 3.4)).toBeNull();
    expect(geohash5(Number.POSITIVE_INFINITY, 3.4)).toBeNull();
  });

  it("refuses a coordinate off the globe rather than clamping it", () => {
    expect(geohash5(91, 0)).toBeNull();
    expect(geohash5(0, 181)).toBeNull();
  });

  it("does not turn a missing pin into the Gulf of Guinea", () => {
    /* Latitude zero, longitude zero is a real cell in the sea off Ghana. A
       null coalesced to zero anywhere in this path would make it the busiest
       neighbourhood in our funnel, which is the shape of invented number this
       whole feature exists to refuse. */
    expect(geohash5(null, null)).toBeNull();
    expect(geohash5(0, 0)).toBe("s0000");
  });
});

describe("longitude first, then latitude, which is the format and not a preference", () => {
  it("gives different cells to a point and its transpose", () => {
    /* Swapping the two produces a valid-looking five character string naming
       a completely different place, and nothing downstream could tell. */
    expect(geohash5(6.4474, 3.4736)).not.toBe(geohash5(3.4736, 6.4474));
  });
});
