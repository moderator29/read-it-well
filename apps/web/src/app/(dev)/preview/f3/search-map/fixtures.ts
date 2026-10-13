import type { Listing } from "@/lib/listings/types";

/**
 * The upgraded search's fixture shelf (search-map track): fictional homes on
 * the catalogue's own photography, spread over Lagos areas the map knows, at
 * rents and move-in totals across the Rent track so the price spread in the
 * sheet has a shape. Integer kobo. Not real inventory and never served
 * outside the harness.
 */
const P = (name: string) => `/brand/photos/${name}.jpg`;
const DAY = 24 * 60 * 60 * 1000;
/** A fixed "now" for the harness, so the listed ages do not drift between shots. */
export const HARNESS_NOW = Date.parse("2026-10-13T09:00:00Z");
const ago = (days: number) => new Date(HARNESS_NOW - days * DAY).toISOString();

function home(over: Partial<Listing> & Pick<Listing, "id" | "title">): Listing {
  return {
    slug: over.id,
    kind: "rental",
    intent: "rent",
    pricePeriod: "year",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 0,
    currency: "NGN",
    bedrooms: 0,
    bathrooms: 0,
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

const id = (n: number) => `00000000-0000-4000-8000-0000000a${String(n).padStart(4, "0")}`;

export const SEARCH_SHELF: Listing[] = [
  home({
    id: id(1),
    title: "Two bedroom flat off Herbert Macaulay Way",
    area: "Yaba",
    priceMinor: 2_400_000_00,
    moveInCostMinor: 3_600_000_00,
    moveInCostStated: true,
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 95,
    verified: true,
    photos: [P("living-room-day"), P("bedroom-01"), P("bathroom-01")],
    publishedAt: ago(2),
    hue: 1,
  }),
  home({
    id: id(2),
    title: "Three bedroom terrace with BQ",
    area: "Lekki Phase 1",
    priceMinor: 6_500_000_00,
    moveInCostMinor: 8_900_000_00,
    moveInCostStated: true,
    bedrooms: 3,
    bathrooms: 4,
    sizeSqm: 180,
    photos: [P("villa-exterior-sunset"), P("living-room-dusk")],
    publishedAt: ago(5),
    hue: 2,
  }),
  home({
    id: id(3),
    title: "Mini flat close to the Unilag gate",
    area: "Yaba",
    priceMinor: 1_100_000_00,
    moveInCostMinor: 1_750_000_00,
    moveInCostStated: true,
    bedrooms: 1,
    bathrooms: 1,
    sizeSqm: 48,
    photos: [P("bedroom-02")],
    publishedAt: ago(9),
    hue: 3,
  }),
  home({
    id: id(4),
    title: "Four bedroom duplex in a gated close",
    area: "Ikoyi",
    priceMinor: 15_000_000_00,
    moveInCostMinor: 19_500_000_00,
    moveInCostStated: true,
    bedrooms: 4,
    bathrooms: 5,
    sizeSqm: 320,
    verified: true,
    photos: [P("villa-pool-terrace"), P("terrace-lounge-night")],
    publishedAt: ago(40),
    hue: 4,
  }),
  home({
    id: id(5),
    title: "Serviced two bedroom apartment",
    area: "Victoria Island",
    priceMinor: 9_000_000_00,
    moveInCostMinor: 11_800_000_00,
    moveInCostStated: true,
    bedrooms: 2,
    bathrooms: 3,
    sizeSqm: 130,
    photos: [P("tower-entrance-dusk")],
    publishedAt: ago(14),
    hue: 5,
  }),
  home({
    id: id(6),
    title: "Five bedroom detached house with a pool",
    area: "Banana Island Ikoyi",
    priceMinor: 28_000_000_00,
    moveInCostMinor: 34_000_000_00,
    moveInCostStated: true,
    bedrooms: 5,
    bathrooms: 6,
    sizeSqm: 610,
    photos: [P("villa-pool-skyline-01"), P("villa-pool-portrait")],
    publishedAt: ago(70),
    hue: 0,
  }),
  home({
    id: id(7),
    title: "Self contain in a quiet compound",
    area: "Yaba",
    priceMinor: 650_000_00,
    moveInCostMinor: 1_000_000_00,
    moveInCostStated: true,
    bedrooms: 1,
    bathrooms: 1,
    photos: [P("bedroom-01")],
    publishedAt: ago(21),
    hue: 1,
  }),
  home({
    id: id(8),
    title: "Three bedroom flat with a study",
    area: "Lekki Waterside",
    priceMinor: 4_800_000_00,
    moveInCostMinor: 6_700_000_00,
    moveInCostStated: true,
    bedrooms: 3,
    bathrooms: 3,
    sizeSqm: 150,
    photos: [P("living-room-dusk")],
    publishedAt: ago(33),
    hue: 2,
  }),
  home({
    id: id(9),
    title: "Four bedroom terrace for sale",
    kind: "home",
    intent: "sale",
    area: "Parkview Estate Ikoyi",
    priceMinor: 420_000_000_00,
    salePriceMinor: 420_000_000_00,
    bedrooms: 4,
    bathrooms: 5,
    sizeSqm: 400,
    photos: [P("villa-exterior-gate")],
    publishedAt: ago(4),
    hue: 3,
  }),
  home({
    id: id(10),
    title: "Two bedroom apartment by the lagoon",
    area: "Lekki Phase 1",
    priceMinor: 5_200_000_00,
    moveInCostMinor: 7_000_000_00,
    moveInCostStated: true,
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 110,
    photos: [P("skyline-waterfront-dusk")],
    publishedAt: ago(12),
    hue: 4,
  }),
];

/** What the harness pretends this account told us: a saved Yaba search with a budget, a saved Lekki home. */
export const HARNESS_SAVED_SEARCH_PARAMS = { q: "Yaba", max: "4000000", market: "rent" };
export const HARNESS_SAVED_HOMES = [{ id: id(10), area: "Lekki Phase 1", city: "Lagos" }];
