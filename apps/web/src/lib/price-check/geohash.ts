/**
 * A FIVE CHARACTER GEOHASH, AND NEVER A POINT.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS RATHER THAN A lat/lng PAIR IN A COLUMN.
 *
 * `public.price_check_events` is the funnel for a screen that processes an
 * address and a financial inference. Every question that table exists to
 * answer - where are people asking, where is demand outrunning supply, which
 * areas do we recruit in next - is answerable at five kilometres. None of them
 * is worth holding a building for.
 *
 * Against 7,825 Nigerians kidnapped between July 2025 and June 2026, up sixty
 * six per cent, a point beside a naira figure is a target selection document.
 * So the analytics row holds a CELL, the cell is five characters, and the
 * table has no column a finer one could go in.
 *
 * ---------------------------------------------------------------------------
 * WHAT FIVE CHARACTERS ACTUALLY MEANS, measured rather than asserted.
 *
 * A geohash alternates longitude and latitude bits. Five characters is 25
 * bits: 13 of longitude and 12 of latitude. That is 360/2^13 by 180/2^12
 * degrees, which is 0.0439 by 0.0439 degrees, which at Nigerian latitudes
 * (4 to 14 degrees north, where a degree of longitude is 111 km times the
 * cosine of the latitude and never less than 108 km) is about 4.9 km by
 * 4.9 km. `geohash.test.ts` asserts that number against real Lagos, Abuja,
 * Kano and Port Harcourt coordinates rather than trusting this paragraph.
 *
 * Six characters would be 1.2 km, which is a neighbourhood, which is a short
 * walk, which is too fine for a row nobody needs that precision from.
 *
 * ---------------------------------------------------------------------------
 * THE ALPHABET IS NOT ARBITRARY. Base 32 with `a`, `i`, `l` and `o` removed,
 * which is the standard geohash alphabet, so a cell computed here is the same
 * cell any other tool computes and the omissions are the characters people
 * misread. The database check constraint on `price_check_events.geohash5`
 * names the same set, so a value from anywhere else is refused rather than
 * stored in a shape nothing can read back.
 */

const ALPHABET = "0123456789bcdefghjkmnpqrstuvwxyz";

/** The cell length this product uses, and the only one the schema accepts. */
export const GEOHASH_PRECISION = 5;

/**
 * Encode a point as a five character cell.
 *
 * Returns null for a point that is not a point. A caller with no pin records
 * no cell, rather than recording a cell for latitude zero, longitude zero,
 * which is in the Gulf of Guinea and which would quietly become the busiest
 * neighbourhood in our funnel.
 */
export function geohash5(
  lat: number | null | undefined,
  lng: number | null | undefined,
  precision: number = GEOHASH_PRECISION,
): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  let hash = "";
  let bits = 0;
  let bit = 0;
  /* Longitude first, then latitude, alternating. That order is the format,
     not a preference: swapping it produces a valid-looking string naming a
     different place. */
  let evenBit = true;

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        bit = (bit << 1) + 1;
        lngMin = mid;
      } else {
        bit = bit << 1;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        bit = (bit << 1) + 1;
        latMin = mid;
      } else {
        bit = bit << 1;
        latMax = mid;
      }
    }
    evenBit = !evenBit;

    bits += 1;
    if (bits === 5) {
      hash += ALPHABET[bit];
      bits = 0;
      bit = 0;
    }
  }

  return hash;
}

/**
 * The bounding box a cell stands for, which is what makes the coarseness
 * checkable instead of claimed. Used by the test and by nothing in the
 * product: a screen never draws a cell, because a drawn cell is a map of
 * where people are asking about their own homes.
 */
export function geohashBounds(hash: string): {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
} {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let evenBit = true;

  for (const character of hash.toLowerCase()) {
    const index = ALPHABET.indexOf(character);
    if (index === -1) throw new Error(`"${character}" is not in the geohash alphabet`);
    for (let n = 4; n >= 0; n -= 1) {
      const bit = (index >> n) & 1;
      if (evenBit) {
        const mid = (lngMin + lngMax) / 2;
        if (bit === 1) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (bit === 1) latMin = mid;
        else latMax = mid;
      }
      evenBit = !evenBit;
    }
  }

  return { latMin, latMax, lngMin, lngMax };
}

/** Metres between two points, for asserting how coarse a cell really is. */
export function metresBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
