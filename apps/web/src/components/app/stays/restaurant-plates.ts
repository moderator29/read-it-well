/**
 * The restaurant photography the lead filed under public/brand/photos,
 * compressed and served through next/image. Stand-in plates for a venue
 * that has no photographs of its own, drawn with the "No photographs yet"
 * label so a category plate is never read as a picture of this venue.
 */
export const RESTAURANT_PLATES: readonly string[] = [
  "/brand/photos/restaurant-01.jpg",
  "/brand/photos/restaurant-02-lounge.jpg",
  "/brand/photos/restaurant-03-bar.jpg",
];

/** A stable plate per venue, so a shelf shows all three rather than one. */
export function restaurantPlate(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % RESTAURANT_PLATES.length;
  return RESTAURANT_PLATES[hash] ?? RESTAURANT_PLATES[0]!;
}
