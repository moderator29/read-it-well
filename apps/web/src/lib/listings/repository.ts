import "server-only";
import { isSupabaseConfigured } from "../supabase/env";
import { diversePick, matchesFilter } from "./filter";
import { SupabaseListingRepository } from "./supabase-repository";
import type { Listing, ListingRepository, ListingSearchFilter } from "./types";

/**
 * Listing data access.
 *
 * Discovery has gone through this one interface since day one, so every
 * surface (home, search, the map, the rent market, listing detail, bookings,
 * the assistant tool) widens the moment the source behind it widens, with no
 * component changes (Master Rules 8 and 66).
 *
 * What the factory returns:
 *   Supabase configured  a merged repository: real published inventory first,
 *                        then the seed catalogue, de-duplicated by id.
 *   otherwise            the seed catalogue alone, exactly as before.
 *   NF_DATA_SOURCE=api   the unimplemented platform API, left untouched.
 *
 * The merge is deliberately one-directional in trust: first-party rows come
 * from Postgres and lead the results, and the seed catalogue fills the shelves
 * behind them while agent supply grows. If the database is unreachable, or the
 * envs are absent, the seed half answers alone and discovery is byte for byte
 * what it is today. Widening the catalogue must never be able to empty it.
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

  /*
   * The rent market: annual tenancies, priced per year. No Reserve; the path
   * is message the agent, inspect the property, then pay. All first-party
   * verified inventory.
   */
  {
    id: "seed-18",
    slug: "lekki-phase-1-two-bed-annual-rent",
    title: "Serviced 2 Bedroom Flat, Lekki Phase 1",
    kind: "rental",
    area: "Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 450_000_000,
    currency: "NGN",
    pricePeriod: "year",
    bedrooms: 2,
    bathrooms: 2,
    rating: 4.7,
    reviewCount: 38,
    verified: true,
    instantBook: false,
    amenities: ["wifi", "kitchen", "parking"],
    photos: [
      photo("1502672260266-1c1ef2d93688"),
      photo("1560185007-cde436f6a4d0"),
      photo("1560185127-6ed189bf02f4"),
    ],
    hue: 1,
  },
  {
    id: "seed-19",
    slug: "yaba-self-contain-annual-rent",
    title: "Bright Self Contain, Yaba",
    kind: "rental",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 90_000_000,
    currency: "NGN",
    pricePeriod: "year",
    bedrooms: 1,
    bathrooms: 1,
    rating: 4.4,
    reviewCount: 21,
    verified: true,
    instantBook: false,
    amenities: ["wifi", "kitchen"],
    photos: [
      photo("1522156373667-4c7234bbd804"),
      photo("1484154218962-a197022b5858"),
      photo("1493809842364-78817add7ffb"),
    ],
    hue: 3,
  },
  {
    id: "seed-20",
    slug: "gwarinpa-three-bed-annual-rent",
    title: "3 Bedroom Terrace Duplex, Gwarinpa",
    kind: "rental",
    area: "Gwarinpa",
    city: "Abuja",
    state: "FCT",
    priceMinor: 350_000_000,
    currency: "NGN",
    pricePeriod: "year",
    bedrooms: 3,
    bathrooms: 3,
    rating: 4.6,
    reviewCount: 29,
    verified: true,
    instantBook: false,
    amenities: ["kitchen", "parking"],
    photos: [
      photo("1512917774080-9991f1c4c750"),
      photo("1600585154340-be6161a56a0c"),
      photo("1600607687939-ce8a6c25118c"),
    ],
    hue: 0,
  },
  {
    id: "seed-21",
    slug: "wuse-2-one-bed-annual-rent",
    title: "Furnished 1 Bedroom Flat, Wuse 2",
    kind: "rental",
    area: "Wuse 2",
    city: "Abuja",
    state: "FCT",
    priceMinor: 220_000_000,
    currency: "NGN",
    pricePeriod: "year",
    bedrooms: 1,
    bathrooms: 1,
    rating: 4.5,
    reviewCount: 17,
    verified: true,
    instantBook: false,
    amenities: ["wifi", "kitchen", "parking"],
    photos: [
      photo("1493663284031-b7e3aefcae8e"),
      photo("1554995207-c18c203602cb"),
      photo("1567767292278-a4f21aa2d36e"),
    ],
    hue: 2,
  },
  {
    id: "seed-22",
    slug: "gra-port-harcourt-two-bed-annual-rent",
    title: "2 Bedroom Flat, GRA Phase 2",
    kind: "rental",
    area: "GRA Phase 2",
    city: "Port Harcourt",
    state: "Rivers",
    priceMinor: 180_000_000,
    currency: "NGN",
    pricePeriod: "year",
    bedrooms: 2,
    bathrooms: 2,
    rating: 4.5,
    reviewCount: 24,
    verified: true,
    instantBook: false,
    amenities: ["kitchen", "parking"],
    photos: [
      photo("1560184897-ae75f418493e"),
      photo("1560448075-bb485b067938"),
      photo("1595526114035-0d45ed16cfbf"),
    ],
    hue: 4,
  },
  {
    id: "seed-23",
    slug: "independence-layout-enugu-three-bed-annual-rent",
    title: "3 Bedroom Bungalow, Independence Layout",
    kind: "rental",
    area: "Independence Layout",
    city: "Enugu",
    state: "Enugu",
    priceMinor: 150_000_000,
    currency: "NGN",
    pricePeriod: "year",
    bedrooms: 3,
    bathrooms: 2,
    rating: 4.6,
    reviewCount: 19,
    verified: true,
    instantBook: false,
    amenities: ["kitchen", "parking"],
    photos: [
      photo("1583608205776-bfd35f0d9f83"),
      photo("1600566753086-00f18fb6b3ea"),
      photo("1600210492486-724fe5c67fb0"),
    ],
    hue: 5,
  },
];

class SeedListingRepository implements ListingRepository {
  readonly isSeed = true;

  async recommended(limit = 6): Promise<Listing[]> {
    // Highest rated first, never two of the same category in a row while an
    // alternative exists, so the rail reads as a tour of the catalogue.
    return diversePick(SEED, limit);
  }

  async search(filter: ListingSearchFilter = {}): Promise<Listing[]> {
    return SEED.filter((l) => matchesFilter(l, filter));
  }

  async byId(id: string): Promise<Listing | null> {
    // Accepts the slug as well as the id so an old deep link keeps resolving.
    return SEED.find((l) => l.id === id || l.slug === id) ?? null;
  }
}

/** Platform listing ids are uuids; catalogue ids are not. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Real inventory first, catalogue behind it.
 *
 * Every method degrades in the same direction: whatever the database cannot
 * answer, the seed catalogue answers. A thrown query, a timeout or an empty
 * table all reduce this repository to the seed repository, which is exactly
 * the behaviour discovery has today.
 */
class MergedListingRepository implements ListingRepository {
  /**
   * Results still contain local catalogue content, and there is no pagination
   * cursor behind them, so this stays true until the catalogue is retired.
   * Search reads it to keep its Load more control disabled rather than
   * offering a page that does not exist.
   */
  readonly isSeed = true;

  private readonly db = new SupabaseListingRepository();
  private readonly seed = new SeedListingRepository();

  private async fromDb<T>(run: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await run();
    } catch {
      return fallback;
    }
  }

  /** Concatenate, keeping the first occurrence of each id. */
  private static dedupe(...groups: Listing[][]): Listing[] {
    const seen = new Set<string>();
    const out: Listing[] = [];
    for (const group of groups) {
      for (const listing of group) {
        if (seen.has(listing.id)) continue;
        seen.add(listing.id);
        out.push(listing);
      }
    }
    return out;
  }

  async search(filter: ListingSearchFilter = {}): Promise<Listing[]> {
    const [live, seed] = await Promise.all([
      this.fromDb(() => this.db.search(filter), [] as Listing[]),
      this.seed.search(filter),
    ]);
    return MergedListingRepository.dedupe(live, seed);
  }

  async recommended(limit = 6): Promise<Listing[]> {
    // Diversity is applied to each half, then the halves are concatenated, so
    // real inventory always leads the rail even while it carries few reviews.
    const live = await this.fromDb(() => this.db.recommended(limit), [] as Listing[]);
    if (live.length >= limit) return live.slice(0, limit);
    const seen = new Set(live.map((l) => l.id));
    const seed = (await this.seed.search({})).filter((l) => !seen.has(l.id));
    return [...live, ...diversePick(seed, limit - live.length)];
  }

  async byId(id: string): Promise<Listing | null> {
    if (UUID_RE.test(id)) {
      const live = await this.fromDb(() => this.db.byId(id), null);
      if (live) return live;
    }
    return this.seed.byId(id);
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
  if (process.env.NF_DATA_SOURCE === "api") return new ApiListingRepository();
  if (isSupabaseConfigured()) return new MergedListingRepository();
  return new SeedListingRepository();
}
