/**
 * The photography plates the marketing surfaces draw on.
 *
 * The lead files these under `public/brand/photos/<name>.jpg`, compressed,
 * under the canonical names from docs/design/CATALOGUE.md section 4 with the
 * `photo-` and `asset-` prefixes dropped. Naming them here means a typo is a
 * type error rather than a broken image on the front page, and every consumer
 * sizes through `next/image` with `fill` so no plate ever ships at its full
 * width to a phone.
 */
export const PHOTO_NAMES = [
  "villa-pool-skyline-01",
  "villa-pool-skyline-02",
  "villa-pool-terrace",
  "villa-pool-portrait",
  "villa-exterior-sunset",
  "villa-exterior-gate",
  "resort-pool-deck",
  "bedroom-01",
  "bedroom-02",
  "bathroom-01",
  "living-room-dusk",
  "living-room-day",
  "terrace-lounge-night",
  "restaurant-01",
  "restaurant-02-lounge",
  "restaurant-03-bar",
  "tower-entrance-dusk",
  "skyline-waterfront-dusk",
  "skyline-bridge-dusk",
  "bg-blue-wave",
] as const;

export type PhotoName = (typeof PHOTO_NAMES)[number];

export function photo(name: PhotoName): string {
  return `/brand/photos/${name}.jpg`;
}
