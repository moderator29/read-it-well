import "server-only";
import type {
  Listing,
  ListingKind,
  ListingRepository,
  ListingSearchFilter,
} from "./types";

/**
 * Listing data access.
 *
 * The platform API does not exist yet. Rather than hardcode listings into
 * components, discovery goes through this interface from day one. Swapping the
 * seed source for the real API is a one line change here and touches no
 * component (Master Rules 8 and 66).
 *
 * Selected by NF_DATA_SOURCE:
 *   "seed" (default) local seed catalogue
 *   "api"            the real platform API, which is not built yet
 */

/** Unsplash public CDN URL for a photo id, sized for the listing grid. */
function photo(id: string): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;
}

/**
 * Seed catalogue.
 *
 * Prices are integers in kobo (18_500_000 kobo is 185,000 naira), nightly for
 * stays and per head for restaurants and experiences. Photography comes from
 * Unsplash's public CDN until the media pipeline lands.
 */
const SEED: Listing[] = [
  // ------------------------------------------------------------------ Lagos
  {
    id: "seed-1",
    slug: "eko-pearl-waterfront-apartment-victoria-island",
    title: "Eko Pearl Waterfront Apartment",
    kind: "apartment",
    area: "Victoria Island",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 18_500_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 2,
    rating: 4.8,
    reviewCount: 142,
    verified: true,
    instantBook: true,
    amenities: ["pool", "wifi", "kitchen", "parking"],
    photos: [
      photo("1522708323590-d24dbb6b0267"),
      photo("1560448204-e02f11c3d0e2"),
      photo("1616486338812-3dadae4b4ace"),
    ],
    hue: 0,
  },
  {
    id: "seed-2",
    slug: "lekki-palm-grove-shortlet",
    title: "Lekki Palm Grove Shortlet",
    kind: "shortlet",
    area: "Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 9_500_000,
    currency: "NGN",
    bedrooms: 1,
    bathrooms: 1,
    rating: 4.6,
    reviewCount: 87,
    verified: true,
    instantBook: true,
    amenities: ["wifi", "kitchen", "parking"],
    photos: [
      photo("1502672260266-1c1ef2d93688"),
      photo("1540518614846-7eded433c457"),
      photo("1484154218962-a197022b5858"),
    ],
    hue: 1,
  },
  {
    id: "seed-3",
    slug: "ikoyi-parkview-penthouse",
    title: "Ikoyi Parkview Penthouse",
    kind: "apartment",
    area: "Parkview Estate, Ikoyi",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 26_000_000,
    currency: "NGN",
    bedrooms: 3,
    bathrooms: 3,
    rating: 4.9,
    reviewCount: 96,
    verified: true,
    instantBook: false,
    amenities: ["pool", "wifi", "kitchen", "parking"],
    photos: [
      photo("1600607687939-ce8a6c25118c"),
      photo("1600607687920-4e2a09cf159d"),
      photo("1586023492125-27b2c045efd7"),
    ],
    hue: 2,
  },
  {
    id: "seed-4",
    slug: "banana-island-villa-azura",
    title: "Villa Azura, Banana Island",
    kind: "villa",
    area: "Banana Island, Ikoyi",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 45_000_000,
    currency: "NGN",
    bedrooms: 5,
    bathrooms: 5,
    rating: 4.9,
    reviewCount: 41,
    verified: true,
    instantBook: false,
    amenities: ["pool", "wifi", "kitchen", "parking"],
    photos: [
      photo("1613490493576-7fde63acd811"),
      photo("1613977257363-707ba9348227"),
      photo("1600596542815-ffad4c1539a9"),
    ],
    hue: 3,
  },
  {
    id: "seed-5",
    slug: "talise-kitchen-victoria-island",
    title: "Talise Kitchen",
    kind: "restaurant",
    area: "Victoria Island",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 2_500_000,
    currency: "NGN",
    bedrooms: 0,
    bathrooms: 0,
    rating: 4.7,
    reviewCount: 214,
    verified: true,
    instantBook: true,
    amenities: ["wifi", "parking"],
    photos: [
      photo("1414235077428-338989a2e8c0"),
      photo("1559339352-11d035aa65de"),
      photo("1504674900247-0877df9cc836"),
    ],
    hue: 4,
  },
  {
    id: "seed-6",
    slug: "lekki-lagoon-sunset-cruise",
    title: "Lekki Lagoon Sunset Cruise",
    kind: "experience",
    area: "Lekki Waterside",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 4_500_000,
    currency: "NGN",
    bedrooms: 0,
    bathrooms: 0,
    rating: 4.8,
    reviewCount: 163,
    verified: true,
    instantBook: true,
    amenities: [],
    photos: [
      photo("1507525428034-b723cf961d3e"),
      photo("1476514525535-07fb3b4ae5f1"),
      photo("1544551763-46a013bb70d5"),
    ],
    hue: 5,
  },
  // ------------------------------------------------------------------ Abuja
  {
    id: "seed-7",
    slug: "maitama-hilltop-residence",
    title: "Maitama Hilltop Residence",
    kind: "home",
    area: "Maitama",
    city: "Abuja",
    state: "FCT",
    priceMinor: 15_000_000,
    currency: "NGN",
    bedrooms: 4,
    bathrooms: 4,
    rating: 4.7,
    reviewCount: 68,
    verified: true,
    instantBook: false,
    amenities: ["wifi", "kitchen", "parking"],
    photos: [
      photo("1600585154340-be6161a56a0c"),
      photo("1600566753190-17f0baa2a6c3"),
      photo("1598928506311-c55ded91a20c"),
    ],
    hue: 0,
  },
  {
    id: "seed-8",
    slug: "wuse-2-city-loft",
    title: "Wuse II City Loft",
    kind: "shortlet",
    area: "Wuse II",
    city: "Abuja",
    state: "FCT",
    priceMinor: 8_500_000,
    currency: "NGN",
    bedrooms: 1,
    bathrooms: 1,
    rating: 4.5,
    reviewCount: 59,
    verified: true,
    instantBook: true,
    amenities: ["wifi", "kitchen"],
    photos: [
      photo("1493809842364-78817add7ffb"),
      photo("1560185127-6ed189bf02f4"),
      photo("1556911220-bff31c812dba"),
    ],
    hue: 1,
  },
  {
    id: "seed-9",
    slug: "the-bougainvillea-hotel-maitama",
    title: "The Bougainvillea Hotel",
    kind: "hotel",
    area: "Maitama",
    city: "Abuja",
    state: "FCT",
    priceMinor: 12_000_000,
    currency: "NGN",
    bedrooms: 1,
    bathrooms: 1,
    rating: 4.6,
    reviewCount: 187,
    verified: true,
    instantBook: true,
    amenities: ["pool", "wifi", "parking"],
    photos: [
      photo("1566073771259-6a8506099945"),
      photo("1582719508461-905c673771fd"),
      photo("1611892440504-42a792e24d32"),
    ],
    hue: 2,
  },
  {
    id: "seed-10",
    slug: "ember-grill-wuse",
    title: "Ember Grill",
    kind: "restaurant",
    area: "Wuse II",
    city: "Abuja",
    state: "FCT",
    priceMinor: 1_800_000,
    currency: "NGN",
    bedrooms: 0,
    bathrooms: 0,
    rating: 4.5,
    reviewCount: 176,
    verified: true,
    instantBook: true,
    amenities: ["parking"],
    photos: [
      photo("1544025162-d76694265947"),
      photo("1517248135467-4c7edcad34c4"),
      photo("1555396273-367ea4eb4db5"),
    ],
    hue: 3,
  },
  // ---------------------------------------------------------- Port Harcourt
  {
    id: "seed-11",
    slug: "gra-garden-duplex-port-harcourt",
    title: "GRA Garden Duplex",
    kind: "home",
    area: "GRA Phase 2",
    city: "Port Harcourt",
    state: "Rivers",
    priceMinor: 11_000_000,
    currency: "NGN",
    bedrooms: 3,
    bathrooms: 3,
    rating: 4.6,
    reviewCount: 52,
    verified: true,
    instantBook: false,
    amenities: ["wifi", "kitchen", "parking"],
    photos: [
      photo("1580587771525-78b9dba3b914"),
      photo("1583847268964-b28dc8f51f92"),
      photo("1615874959474-d609969a20ed"),
    ],
    hue: 4,
  },
  {
    id: "seed-12",
    slug: "riverside-suites-old-gra",
    title: "Riverside Suites",
    kind: "hotel",
    area: "Old GRA",
    city: "Port Harcourt",
    state: "Rivers",
    priceMinor: 7_800_000,
    currency: "NGN",
    bedrooms: 1,
    bathrooms: 1,
    rating: 4.4,
    reviewCount: 121,
    verified: true,
    instantBook: true,
    amenities: ["wifi", "parking"],
    photos: [
      photo("1590490360182-c33d57733427"),
      photo("1618773928121-c32242e63f39"),
      photo("1596394516093-501ba68a0ba6"),
    ],
    hue: 5,
  },
  // ----------------------------------------------------------------- Ibadan
  {
    id: "seed-13",
    slug: "bodija-ridge-apartment-ibadan",
    title: "Bodija Ridge Apartment",
    kind: "apartment",
    area: "Bodija",
    city: "Ibadan",
    state: "Oyo",
    priceMinor: 6_000_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 2,
    rating: 4.5,
    reviewCount: 47,
    verified: true,
    instantBook: true,
    amenities: ["wifi", "kitchen", "parking"],
    photos: [
      photo("1560185007-cde436f6a4d0"),
      photo("1505693416388-ac5ce068fe85"),
      photo("1616594039964-ae9021a400a0"),
    ],
    hue: 0,
  },
  {
    id: "seed-14",
    slug: "agodi-parkside-cottage-ibadan",
    title: "Agodi Parkside Cottage",
    kind: "home",
    area: "Agodi GRA",
    city: "Ibadan",
    state: "Oyo",
    priceMinor: 5_500_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 1,
    rating: 4.3,
    reviewCount: 33,
    verified: false,
    instantBook: false,
    amenities: ["wifi", "parking"],
    photos: [
      photo("1568605114967-8130f3a36994"),
      photo("1564013799919-ab600027ffc6"),
      photo("1600047509807-ba8f99d2cdde"),
    ],
    hue: 1,
  },
  // ------------------------------------------------------------------ Enugu
  {
    id: "seed-15",
    slug: "independence-layout-terrace-enugu",
    title: "Independence Layout Terrace",
    kind: "shortlet",
    area: "Independence Layout",
    city: "Enugu",
    state: "Enugu",
    priceMinor: 7_000_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 2,
    rating: 4.5,
    reviewCount: 44,
    verified: true,
    instantBook: true,
    amenities: ["wifi", "kitchen", "parking"],
    photos: [
      photo("1570129477492-45c003edd2be"),
      photo("1600566753086-00f18fb6b3ea"),
      photo("1512917774080-9991f1c4c750"),
    ],
    hue: 2,
  },
  // ---------------------------------------------------------------- Calabar
  {
    id: "seed-16",
    slug: "marina-boutique-hotel-calabar",
    title: "Marina Boutique Hotel",
    kind: "hotel",
    area: "Marina Waterfront",
    city: "Calabar",
    state: "Cross River",
    priceMinor: 8_800_000,
    currency: "NGN",
    bedrooms: 1,
    bathrooms: 1,
    rating: 4.6,
    reviewCount: 98,
    verified: true,
    instantBook: true,
    amenities: ["pool", "wifi", "parking"],
    photos: [
      photo("1571896349842-33c89424de2d"),
      photo("1520250497591-112f2f40a3f4"),
      photo("1631049307264-da0ec9d70304"),
    ],
    hue: 3,
  },
  {
    id: "seed-17",
    slug: "kwa-falls-marina-day-trip-calabar",
    title: "Kwa Falls and Marina Day Trip",
    kind: "experience",
    area: "Marina Waterfront",
    city: "Calabar",
    state: "Cross River",
    priceMinor: 3_500_000,
    currency: "NGN",
    bedrooms: 0,
    bathrooms: 0,
    rating: 4.7,
    reviewCount: 71,
    verified: true,
    instantBook: true,
    amenities: [],
    photos: [
      photo("1519046904884-53103b34b206"),
      photo("1506929562872-bb421503ef21"),
      photo("1473116763249-2faaef81ccda"),
    ],
    hue: 4,
  },
];

/** Case-insensitive haystack for free text matching. */
function haystack(l: Listing): string {
  return `${l.title} ${l.area} ${l.city} ${l.state} ${l.kind}`.toLowerCase();
}

class SeedListingRepository implements ListingRepository {
  readonly isSeed = true;

  async recommended(limit = 6): Promise<Listing[]> {
    // Highest rated first, but never two of the same category in a row while
    // an alternative exists, so the rail reads as a tour of the catalogue.
    const pool = [...SEED].sort(
      (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    );
    const out: Listing[] = [];
    while (out.length < limit && pool.length > 0) {
      const prev: ListingKind | undefined = out[out.length - 1]?.kind;
      const idx = pool.findIndex((l) => l.kind !== prev);
      const pick = pool.splice(idx === -1 ? 0 : idx, 1)[0];
      if (!pick) break;
      out.push(pick);
    }
    return out;
  }

  async search(filter: ListingSearchFilter = {}): Promise<Listing[]> {
    const q = filter.q?.trim().toLowerCase();
    return SEED.filter((l) => {
      if (filter.kind && l.kind !== filter.kind) return false;
      if (q && !haystack(l).includes(q)) return false;
      return true;
    });
  }

  async byId(id: string): Promise<Listing | null> {
    // Accepts the slug as well as the id so an old deep link keeps resolving.
    return SEED.find((l) => l.id === id || l.slug === id) ?? null;
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
  async search(): Promise<Listing[]> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the platform API is not implemented yet. " +
        "Unset it to fall back to seed content.",
    );
  }
  async byId(): Promise<Listing | null> {
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
