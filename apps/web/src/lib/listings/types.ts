/** Domain types for discovery results. Shared by every data source. */

export type ListingKind =
  | "hotel"
  | "apartment"
  | "home"
  | "shortlet"
  | "villa"
  | "restaurant"
  | "experience"
  /**
   * Long-term lettings, the serious rent market: annual tenancy, priced per
   * year, no Reserve button. The path is message the agent, inspect, then
   * pay. Distinct from "apartment", which is nightly lodging.
   */
  | "rental"
  /**
   * The commercial and land market. Let on a tenancy exactly like a rental:
   * priced per year, arranged with the agent, inspected before payment, and
   * never reserved by the night.
   */
  | "shop"
  | "office"
  | "land";

/**
 * Everything a partner listing carries that a first-party listing does not.
 *
 * Present only when `source` is "partner", and it is what the card and the
 * detail page read to decide the call to action: there is no agent to message
 * and no booking of ours to reserve, so the action always leaves the platform
 * (docs/HYBRID_INVENTORY.md section 4).
 */
export type PartnerMeta = {
  /** Which feed supplied the listing. */
  provider: "amadeus" | "places";
  /**
   * Attribution the data source requires wherever its data is shown. Google
   * Places content must render "powered by Google" on the surfaces it appears
   * on, so the mapped listing carries the obligation with it.
   */
  attribution?: "Google";
  /** Where a partner stay is booked. Off platform, opens in a new tab. */
  bookUrl?: string;
  /** Map deep link to a partner venue. */
  directionsUrl?: string;
  /** The venue's own page (menu, opening times) when the feed supplies one. */
  venueUrl?: string;
  /** Opaque upstream reference for the offer this price came from. */
  offerRef?: string;
};

export type Listing = {
  id: string;
  slug: string;
  title: string;
  kind: ListingKind;
  /** Display locality, e.g. "Lekki Phase 1". */
  area: string;
  /** Settlement, e.g. "Lagos". */
  city: string;
  state: string;
  /**
   * Rate in MINOR UNITS (kobo). Never a float, never naira.
   * 25_000_000 kobo is 250,000 naira. Nightly for stays, per head for
   * restaurants and experiences.
   */
  priceMinor: number;
  /**
   * Charged once per stay, on top of the nightly rate, in kobo.
   *
   * These exist so the breakdown a guest reads BEFORE booking is the same
   * arithmetic `reserve()` does after. They were server-only until now, which
   * meant the panel showed a "Total" that was really the subtotal and then
   * asked for a larger number at checkout. Absent or zero renders no row.
   */
  cleaningMinor?: number;
  serviceMinor?: number;
  currency: "NGN";
  /**
   * What the price covers. "night" for stays (default), "year" for rentals.
   * Restaurants and experiences stay per head regardless of this field.
   */
  pricePeriod?: "night" | "year";
  /**
   * Where the listing comes from. "rentme" (default) is our own agent
   * inventory and is the only source that may carry the verified badge and
   * in-platform messaging. "partner" is third-party stock (hotel and
   * restaurant feeds); partner cards never show the verified badge.
   */
  source?: "rentme" | "partner";
  /**
   * Provenance and off-platform actions for third-party stock. Set by the
   * inventory provider layer, absent on every first-party listing.
   */
  partner?: PartnerMeta;
  bedrooms: number;
  bathrooms: number;
  /**
   * How many guests the host says the place takes, when the source states a
   * number. Agent inventory always carries one (`listings.max_guests`, which
   * the wizard collects and a check constraint keeps above zero). The seed
   * catalogue does not, so it is optional and the shared `sleeps` matcher
   * falls back to the two-per-bedroom convention for anything that omits it.
   */
  maxGuests?: number;
  /**
   * Light, water and the gate: the three questions asked here before the
   * price. Absent on partner stock and on the seed catalogue, which have no
   * honest answer, and rendered as unanswered rather than as good news.
   */
  utilities?: {
    powerGrid?: "BAND_A" | "MOSTLY_ON" | "PATCHY" | "RARELY" | "NONE";
    powerBackup?: "NONE" | "GENERATOR" | "INVERTER" | "SOLAR" | "GENERATOR_INVERTER";
    powerBackupHours?: number;
    waterSupply?: "TREATED_MAINS" | "BOREHOLE" | "PUMPED_STORAGE" | "TANKER" | "NONE";
    prepaidMeter?: boolean;
    /** True when the host has stored gate details. Never the details themselves. */
    hasEstateAccess: boolean;
  };
  rating: number;
  reviewCount: number;
  verified: boolean;
  instantBook: boolean;
  amenities: string[];
  /**
   * Photo URLs, best first. Public CDN imagery until the media pipeline
   * lands; the card falls back to a gradient tile when a photo cannot load.
   */
  photos: string[];
  /** Deterministic hue index for the gradient fallback tile, 0 to 5. */
  hue: number;
};

export type ListingSearchFilter = {
  /** Free text matched against title, area, city and state. */
  q?: string;
  /** Restrict results to a single category. */
  kind?: ListingKind;
  /**
   * Budget floor and ceiling in MINOR UNITS (kobo), matched against
   * `priceMinor` in its own period: per night for stays, per year for rentals,
   * per head for restaurants and experiences. A listing that carries no real
   * price (a partner venue with a price level rather than an amount) is
   * excluded the moment either bound is asked for, because nothing can promise
   * it fits a budget.
   */
  minPriceMinor?: number;
  maxPriceMinor?: number;
  /** Minimum bedrooms. A place with none never satisfies a bedroom minimum. */
  bedrooms?: number;
  /** Minimum bathrooms, same rule. */
  bathrooms?: number;
  /**
   * Minimum party size the place must take. Judged against the host's declared
   * capacity where there is one, and against the two-per-bedroom convention
   * where there is not. A listing with neither (a restaurant table, an
   * experience) has no capacity to judge and is never excluded by this.
   */
  guests?: number;
  /** Amenity codes that must ALL be present. Same codes the agent flow writes. */
  amenities?: string[];
  /** Only places that can be booked without waiting for an agent to reply. */
  instantBook?: boolean;
  /** Only first-party verified inventory. Partner stock can never satisfy it. */
  verifiedOnly?: boolean;
};

export interface ListingRepository {
  /** True when results come from local seed content rather than the platform. */
  readonly isSeed: boolean;
  recommended(limit?: number): Promise<Listing[]>;
  /** Filtered catalogue lookup for the discovery surface. */
  search(filter?: ListingSearchFilter): Promise<Listing[]>;
  /** Single listing lookup for the detail page. Resolves null when unknown. */
  byId(id: string): Promise<Listing | null>;
}
