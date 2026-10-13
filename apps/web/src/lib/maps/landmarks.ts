import { placeKey, type LatLng } from "@/components/app/search/mapGeo";
import { metresBetween } from "@/lib/price-check/geohash";

/**
 * ONE LANDMARK PER CITY, FOR "GETTING THERE" (the listing's Map tab).
 *
 * The city's airport, because it is the one place nearly every newcomer to a
 * city measures from, and its position is a public fact rather than ours.
 * The distance is drawn only between two points we actually hold (this table
 * and the area centroid in `mapGeo.ts`), as a straight line, rounded, and
 * said to be both: "about 14 km in a straight line". No road distance and no
 * drive time is ever invented from it; the rush-hour bands (V-43) are the
 * only travel times on the page.
 */
export type Landmark = { name: string; at: LatLng };

const AIRPORTS: Record<string, Landmark> = {
  lagos: { name: "Murtala Muhammed Airport", at: { lat: 6.5774, lng: 3.3212 } },
  abuja: { name: "Nnamdi Azikiwe Airport", at: { lat: 9.0068, lng: 7.2632 } },
  portharcourt: { name: "Port Harcourt Airport", at: { lat: 5.0155, lng: 6.9496 } },
  ibadan: { name: "Ibadan Airport", at: { lat: 7.362, lng: 3.9783 } },
  enugu: { name: "Akanu Ibiam Airport", at: { lat: 6.4743, lng: 7.5619 } },
  calabar: { name: "Margaret Ekpo Airport", at: { lat: 4.976, lng: 8.3472 } },
};

export function airportFor(city: string): Landmark | null {
  return AIRPORTS[placeKey(city)] ?? null;
}

/** Whole kilometres in a straight line, never under one. */
export function straightKm(a: LatLng, b: LatLng): number {
  return Math.max(1, Math.round(metresBetween(a.lat, a.lng, b.lat, b.lng) / 1000));
}
