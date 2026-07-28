import "server-only";
import type { Listing, ListingRepository } from "./types";

/**
 * Listing data access.
 *
 * The platform API does not exist yet. Rather than hardcode listings into
 * components and pretend they are real, discovery goes through this interface
 * from day one. Swapping the seed source for the real API is a one line change
 * here and touches no component (Master Rules 8 and 66).
 *
 * Selected by NF_DATA_SOURCE:
 *   "seed" (default) local sample content, clearly flagged in the UI
 *   "api"            the real platform API, which is not built yet
 */

/**
 * Sample content for layout and design work.
 *
 * Prices are in kobo. These are illustrative and are never presented to a user
 * as live inventory: the UI marks seed results explicitly outside production.
 */
const SEED: Listing[] = [
  {
    id: "seed-1",
    slug: "oceanview-3br-apartment-lekki",
    title: "Oceanview 3BR Apartment",
    kind: "apartment",
    area: "Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 25_000_000,
    currency: "NGN",
    bedrooms: 3,
    bathrooms: 3,
    rating: 4.8,
    reviewCount: 128,
    verified: true,
    instantBook: true,
    amenities: ["pool", "wifi", "kitchen", "parking"],
    hue: 0,
  },
  {
    id: "seed-2",
    slug: "victoria-island-luxury-stay",
    title: "Victoria Island Luxury Stay",
    kind: "apartment",
    area: "Victoria Island",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 28_000_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 2,
    rating: 4.7,
    reviewCount: 86,
    verified: true,
    instantBook: true,
    amenities: ["wifi", "kitchen"],
    hue: 1,
  },
  {
    id: "seed-3",
    slug: "cozy-studio-apartment-ikeja",
    title: "Cozy Studio Apartment",
    kind: "shortlet",
    area: "Ikeja",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 12_000_000,
    currency: "NGN",
    bedrooms: 1,
    bathrooms: 1,
    rating: 4.6,
    reviewCount: 54,
    verified: false,
    instantBook: false,
    amenities: ["wifi"],
    hue: 2,
  },
  {
    id: "seed-4",
    slug: "executive-2br-duplex-garki",
    title: "Executive 2BR Duplex",
    kind: "home",
    area: "Garki",
    city: "Abuja",
    state: "FCT",
    priceMinor: 18_000_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 2,
    rating: 4.7,
    reviewCount: 72,
    verified: true,
    instantBook: false,
    amenities: ["wifi", "parking"],
    hue: 3,
  },
  {
    id: "seed-5",
    slug: "luxury-4br-penthouse-banana-island",
    title: "Luxury 4BR Penthouse",
    kind: "villa",
    area: "Banana Island",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 45_000_000,
    currency: "NGN",
    bedrooms: 4,
    bathrooms: 4,
    rating: 4.5,
    reviewCount: 39,
    verified: true,
    instantBook: true,
    amenities: ["pool", "wifi", "kitchen", "parking"],
    hue: 4,
  },
  {
    id: "seed-6",
    slug: "shortlet-gra-phase-2-port-harcourt",
    title: "Shortlet in Port Harcourt",
    kind: "shortlet",
    area: "GRA Phase 2",
    city: "Port Harcourt",
    state: "Rivers",
    priceMinor: 11_000_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 2,
    rating: 4.4,
    reviewCount: 31,
    verified: false,
    instantBook: false,
    amenities: ["wifi"],
    hue: 5,
  },
];

class SeedListingRepository implements ListingRepository {
  readonly isSeed = true;
  async recommended(limit = 6): Promise<Listing[]> {
    return SEED.slice(0, limit);
  }
}

class ApiListingRepository implements ListingRepository {
  readonly isSeed = false;
  async recommended(): Promise<Listing[]> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the platform API is not implemented yet. " +
        "Unset it to fall back to seed content.",
    );
  }
}

export function getListingRepository(): ListingRepository {
  return process.env.NF_DATA_SOURCE === "api"
    ? new ApiListingRepository()
    : new SeedListingRepository();
}
