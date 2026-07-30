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
  | "rental";

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
