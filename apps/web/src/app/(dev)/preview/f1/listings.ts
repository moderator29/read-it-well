import type { Listing } from "@/lib/listings/types";
import type { AssistantListingItem } from "@/lib/assistant/types";

/**
 * Fixture listings for the F1 preview pages. Brand-neutral, fictional, and
 * photographed with the reference plates the lead filed under
 * `public/brand/photos`. They exist because the catalogue cannot be read
 * from this sandbox (the egress proxy refuses the Supabase host), so the
 * home and assistant previews would otherwise draw an empty shelf. Never
 * rendered on a product route.
 */
function listing(partial: Partial<Listing> & Pick<Listing, "id" | "title" | "kind">): Listing {
  return {
    slug: partial.id,
    area: "Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 0,
    currency: "NGN",
    bedrooms: 0,
    bathrooms: 0,
    rating: 0,
    reviewCount: 0,
    verified: true,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...partial,
  };
}

export const LISTINGS: Listing[] = [
  listing({
    id: "00000000-0000-4000-8000-00000000a001",
    title: "Luxury 4 Bedroom with BQ",
    kind: "home",
    intent: "rent",
    pricePeriod: "year",
    priceMinor: 12_000_000_00,
    bedrooms: 4,
    bathrooms: 5,
    sizeSqm: 320,
    photos: ["/brand/photos/villa-pool-skyline-01.jpg"],
    utilities: { powerGrid: "BAND_A", powerBackup: "GENERATOR", hasEstateAccess: true },
    hue: 1,
  }),
  listing({
    id: "00000000-0000-4000-8000-00000000a002",
    title: "Luxury 3 Bedroom Duplex",
    kind: "apartment",
    intent: "rent",
    pricePeriod: "year",
    priceMinor: 950_000_00,
    bedrooms: 3,
    bathrooms: 3,
    sizeSqm: 210,
    photos: ["/brand/photos/villa-exterior-gate.jpg"],
    utilities: { powerGrid: "MOSTLY_ON", powerBackup: "INVERTER", hasEstateAccess: true },
    hue: 2,
  }),
  listing({
    id: "00000000-0000-4000-8000-00000000a003",
    title: "2 Bedroom Apartment, Osapa",
    kind: "apartment",
    area: "Osapa London",
    intent: "rent",
    pricePeriod: "year",
    priceMinor: 1_850_000_00,
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 130,
    photos: ["/brand/photos/living-room-dusk.jpg"],
    utilities: { powerGrid: "BAND_A", powerBackup: "SOLAR", hasEstateAccess: false },
    hue: 3,
  }),
  listing({
    id: "00000000-0000-4000-8000-00000000a004",
    title: "Penthouse with terrace",
    kind: "shortlet",
    area: "Victoria Island",
    pricePeriod: "night",
    priceMinor: 185_000_00,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    photos: ["/brand/photos/terrace-lounge-night.jpg"],
    hue: 4,
  }),
];

/** The same two rows as the assistant route would stream them. */
export const ASSISTANT_ITEMS: AssistantListingItem[] = [
  {
    id: LISTINGS[2]!.id,
    title: "2 Bedroom Apartment, Lekki Phase 1",
    city: "Lekki, Lagos",
    kind: "apartment",
    price: "NGN 1,650,000 per year",
    rating: 4.6,
    href: `/listing/${LISTINGS[2]!.id}`,
    photo: "/brand/photos/villa-pool-skyline-02.jpg",
  },
  {
    id: LISTINGS[1]!.id,
    title: "2 Bedroom Apartment, Osapa London",
    city: "Lekki, Lagos",
    kind: "apartment",
    price: "NGN 1,850,000 per year",
    rating: 4.8,
    href: `/listing/${LISTINGS[1]!.id}`,
    photo: "/brand/photos/living-room-day.jpg",
  },
];
