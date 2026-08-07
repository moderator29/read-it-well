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
  provider: "places" | "liteapi";
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
   * Where the place actually is, when the source knows.
   *
   * Optional because two of the three sources genuinely may not know:
   * `listings.latitude` and `listings.longitude` are nullable columns and the
   * agent wizard does not force a pin, and a partner feed occasionally answers
   * without a geocode. Absent is therefore a real state, not a mapping bug, and
   * every reader has to handle it.
   *
   * This is what lets two feeds be told apart from two listings of the same
   * building: a name match alone cannot distinguish "Bogobiri House" in Ikoyi
   * from a second place of the same name in Calabar, and a coordinate can.
   * See `lib/inventory/dedupe.ts`, which is the only place that reads it for
   * that purpose. `RealMap` still places by area centroid, so nothing about the
   * map changes by these arriving.
   */
  lat?: number;
  lng?: number;
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
    powerGrid?: PowerGrid;
    powerBackup?: PowerBackup;
    powerBackupHours?: number;
    waterSupply?: WaterSupply;
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

/**
 * Light and water, as the database spells them.
 *
 * These mirror `public.power_grid`, `public.power_backup` and
 * `public.water_supply` exactly, and they are named here rather than inlined
 * so that the filter, the card, the detail panel and the agent wizard cannot
 * drift into four spellings of the same closed list.
 */
export type PowerGrid = "BAND_A" | "MOSTLY_ON" | "PATCHY" | "RARELY" | "NONE";
export type PowerBackup = "NONE" | "GENERATOR" | "INVERTER" | "SOLAR" | "GENERATOR_INVERTER";
export type WaterSupply = "TREATED_MAINS" | "BOREHOLE" | "PUMPED_STORAGE" | "TANKER" | "NONE";

/** Every water source that is water. `NONE` is an answer, not an option. */
export const WATER_SOURCES: readonly WaterSupply[] = [
  "TREATED_MAINS",
  "BOREHOLE",
  "PUMPED_STORAGE",
  "TANKER",
] as const;

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
  /**
   * Light and water: the two questions asked here before the price.
   *
   * All three are **strict**, and that is the point rather than an oversight.
   * A listing whose host has not answered is excluded the moment one of these
   * is asked for, because "we do not know" cannot be shown to somebody who
   * asked for a generator. The seed catalogue and partner stock carry no
   * answer at all, so they never satisfy one of these, which is correct: no
   * feed can promise a borehole.
   *
   * Because a filter that can only ever return nothing is a dead end, the
   * drawer offers these controls only when the pool in front of the reader
   * actually holds an answer, and the water chips list only the sources
   * present in it. See `FilterDrawer`.
   */
  powerBackup?: boolean;
  /** Only a Band A feeder, the top grid band the discos sell. */
  powerBandA?: boolean;
  /**
   * Water sources, any of which will do. This is the one filter here with OR
   * semantics, because a source is one column with one value: asking for both
   * a borehole and treated mains as an AND would match nothing, every time.
   */
  waterSupply?: WaterSupply[];
};

/**
 * How a search should be answered, as opposed to what it asks for.
 *
 * `partners: false` says "our own inventory only, do not call anybody". It
 * exists because a partner call is a BILLED REQUEST against somebody's daily
 * quota, and the discovery page was spending three sets of them per render for
 * one set of results. See the note on the map floor in the search page.
 */
export type ListingSearchOptions = {
  /** Default true. False skips every partner feed and spends nothing. */
  partners?: boolean;
};

export interface ListingRepository {
  /** True when results come from local seed content rather than the platform. */
  readonly isSeed: boolean;
  recommended(limit?: number): Promise<Listing[]>;
  /** Filtered catalogue lookup for the discovery surface. */
  search(filter?: ListingSearchFilter, opts?: ListingSearchOptions): Promise<Listing[]>;
  /** Single listing lookup for the detail page. Resolves null when unknown. */
  byId(id: string): Promise<Listing | null>;
}
