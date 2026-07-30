/**
 * Map geometry for discovery.
 *
 * Three jobs, all pure and all testable without a browser:
 *
 *   1. Placing a listing. The catalogue carries a locality name, never a
 *      coordinate, so a listing is placed at the real centroid of its locality
 *      when we know it and at its city otherwise. Nothing here invents street
 *      level precision, and the map says so on the surface: a pin means "this
 *      place is in this area", not "this place is at this point".
 *   2. Separating pins that land on the very same coordinate, so two stays in
 *      Victoria Island do not stack into one unreadable pill.
 *   3. Projecting and grouping for the screen: a bounds fitting projector used
 *      when the tile engine is unavailable, and screen space grid clustering
 *      so a dense city reads as counts rather than noise.
 */

export type LatLng = { lat: number; lng: number };
export type ScreenPoint = { x: number; y: number };

/**
 * Normalise a place name to a lookup key: lowercase, letters and digits only,
 * with roman numerals folded so "Wuse II" and "Wuse 2" are one place.
 */
export function placeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word === "ii" ? "2" : word === "iii" ? "3" : word))
    .join("");
}

/**
 * Real centroids for the localities the catalogue actually names, keyed
 * `city|area`. Keyed by city as well as area because a name like "GRA Phase 2"
 * exists in more than one Nigerian city and must never resolve to the wrong
 * one. Anything not listed here falls back to its city coordinate, which the
 * caller supplies, so this table can grow without touching the map.
 */
const AREA_COORDS: Record<string, LatLng> = {
  "lagos|victoriaisland": { lat: 6.4281, lng: 3.4219 },
  "lagos|lekkiphase1": { lat: 6.4402, lng: 3.4712 },
  "lagos|parkviewestateikoyi": { lat: 6.4551, lng: 3.4462 },
  "lagos|bananaislandikoyi": { lat: 6.4423, lng: 3.4429 },
  "lagos|lekkiwaterside": { lat: 6.4368, lng: 3.4785 },
  "lagos|ikoyi": { lat: 6.4529, lng: 3.4348 },
  "lagos|yaba": { lat: 6.5095, lng: 3.3711 },
  "abuja|maitama": { lat: 9.0823, lng: 7.4934 },
  "abuja|wuse2": { lat: 9.0762, lng: 7.4712 },
  "abuja|gwarinpa": { lat: 9.1092, lng: 7.4032 },
  "portharcourt|graphase2": { lat: 4.8182, lng: 7.0113 },
  "portharcourt|oldgra": { lat: 4.8003, lng: 7.0092 },
  "ibadan|bodija": { lat: 7.4251, lng: 3.9082 },
  "ibadan|agodigra": { lat: 7.4053, lng: 3.9024 },
  "enugu|independencelayout": { lat: 6.4452, lng: 7.5152 },
  "calabar|marinawaterfront": { lat: 4.9661, lng: 8.3223 },
};

/**
 * Where a listing sits. `byArea` is false when we only knew the city, which is
 * what the surface note is honest about.
 */
export function localityFor(
  city: string,
  area: string,
  cityAt: LatLng,
): { at: LatLng; byArea: boolean } {
  const known = AREA_COORDS[`${placeKey(city)}|${placeKey(area)}`];
  return known ? { at: known, byArea: true } : { at: cityAt, byArea: false };
}

/** About 600 metres at Nigerian latitudes: enough to separate, never enough to mislead. */
const SPREAD_DEGREES = 0.0055;

/**
 * Fan out entries that share one coordinate.
 *
 * Only exact co-location is touched, and only in a ring around the shared
 * point, so a group still reads as "these are all in this locality". Order in
 * equals order out, so the same catalogue always produces the same map.
 */
export function spreadCoincident<T extends { at: LatLng }>(entries: T[]): T[] {
  const groups = new Map<string, number[]>();
  entries.forEach((entry, index) => {
    const key = `${entry.at.lat.toFixed(5)},${entry.at.lng.toFixed(5)}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(index);
    else groups.set(key, [index]);
  });

  const out = [...entries];
  for (const indices of groups.values()) {
    if (indices.length < 2) continue;
    indices.forEach((index, seat) => {
      const entry = out[index];
      if (!entry) return;
      const angle = (seat / indices.length) * Math.PI * 2;
      const radius = SPREAD_DEGREES * (1 + Math.floor(seat / 8) * 0.7);
      out[index] = {
        ...entry,
        at: {
          lat: entry.at.lat + Math.sin(angle) * radius,
          lng: entry.at.lng + Math.cos(angle) * radius,
        },
      };
    });
  }
  return out;
}

/**
 * A bounds fitting projector, used when the tile engine is not available.
 *
 * Equirectangular with a cosine correction at the mid latitude: exact enough
 * over a single country, and it keeps every pin inside the frame so the view
 * still reads as a map of somewhere real rather than an empty box.
 */
export function fitProjector(
  points: LatLng[],
  size: { w: number; h: number },
  pad: number,
): (at: LatLng) => ScreenPoint {
  const centreX = size.w / 2;
  const centreY = size.h / 2;
  if (points.length === 0) return () => ({ x: centreX, y: centreY });

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const squeeze = Math.cos((midLat * Math.PI) / 180) || 1;
  const spanX = Math.max((maxLng - minLng) * squeeze, 0.02);
  const spanY = Math.max(maxLat - minLat, 0.02);
  const usableW = Math.max(size.w - pad * 2, 1);
  const usableH = Math.max(size.h - pad * 2, 1);
  const scale = Math.min(usableW / spanX, usableH / spanY);

  return (at) => ({
    x: centreX + (at.lng - midLng) * squeeze * scale,
    y: centreY - (at.lat - midLat) * scale,
  });
}

export type PinGroup<T> = { key: string; x: number; y: number; items: T[] };

/**
 * Screen space grid clustering.
 *
 * Every mark is dropped into a square cell of the current viewport; a cell
 * holding more than one mark is drawn once, as a count, at the mean position
 * of its members. This is real grouping, not thinning: nothing is discarded,
 * every listing is inside exactly one group, and the counts always sum to the
 * number of visible listings.
 *
 * Its limits, stated plainly: the grid is anchored to the viewport, so a pan
 * can move a mark from one cell to the next and regroup it; the count bubble
 * sits at the mean of its members rather than at a weighted centre of mass;
 * and two marks either side of a cell edge stay apart even when they are close
 * on screen. It is the honest cheap option, and it is deterministic for a
 * given viewport.
 */
export function clusterByGrid<T extends ScreenPoint>(
  items: T[],
  cell: number,
): PinGroup<T>[] {
  const size = Math.max(cell, 1);
  const cells = new Map<string, PinGroup<T>>();
  const order: string[] = [];

  for (const item of items) {
    const key = `${Math.floor(item.x / size)}:${Math.floor(item.y / size)}`;
    const group = cells.get(key);
    if (group) {
      group.items.push(item);
    } else {
      cells.set(key, { key, x: item.x, y: item.y, items: [item] });
      order.push(key);
    }
  }

  const out: PinGroup<T>[] = [];
  for (const key of order) {
    const group = cells.get(key);
    if (!group) continue;
    if (group.items.length > 1) {
      let sumX = 0;
      let sumY = 0;
      for (const item of group.items) {
        sumX += item.x;
        sumY += item.y;
      }
      group.x = sumX / group.items.length;
      group.y = sumY / group.items.length;
    }
    out.push(group);
  }
  return out;
}

/** Latitude and longitude box, as the map engine reports the visible area. */
export type GeoBox = { north: number; south: number; east: number; west: number };

export function inBox(at: LatLng, box: GeoBox): boolean {
  return (
    at.lat <= box.north && at.lat >= box.south && at.lng <= box.east && at.lng >= box.west
  );
}
