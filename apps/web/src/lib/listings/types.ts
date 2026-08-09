/** Domain types for discovery results. Shared by every data source. */

import type {
  BuildCondition,
  Furnishing,
  LandTenure,
  ListingIntent,
  PricePeriod,
  RentPeriod,
  SaleStatus,
} from "./pricing";

export type {
  BuildCondition,
  Furnishing,
  LandTenure,
  ListingIntent,
  PricePeriod,
  RatePeriod,
  RentPeriod,
  SaleStatus,
} from "./pricing";

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
 * THERE IS NO PARTNER SHAPE HERE ANY MORE.
 *
 * `PartnerMeta` and `source: "partner"` described third-party stock: Google
 * Places venues and LiteAPI hotels, merged into discovery behind first-party
 * rows, carrying an off-platform booking link instead of an agent to message.
 * All of it is deleted. Every listing on RentMe is listed by a real person on
 * RentMe, which is the only reason the verified badge, escrow and an
 * inspection can mean anything at all.
 *
 * `source` is kept as a single-valued field rather than removed outright
 * because it is the honest name for the answer, and because a future
 * first-party import (an agency onboarding its own book) would be a second
 * value here rather than a second code path.
 */

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
   * Optional because the source genuinely may not know:
   * `listings.latitude` and `listings.longitude` are nullable columns and the
   * listing wizard does not force a pin. Absent is therefore a real state, not
   * a mapping bug, and every reader has to handle it.
   *
   * `RealMap` still places by area centroid where a pin is missing, so an
   * absent coordinate degrades to an approximate position rather than to no
   * position at all.
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
   * What the price covers.
   *
   * Widened from the original "night" | "year" pair because the database now
   * states the cycle rather than inferring it from the category: a rent can be
   * monthly, quarterly or yearly, and a rate can be per night or per head. Every
   * existing reader compares against "year" or falls through to nightly, which
   * stays correct under the wider union.
   *
   * Absent on a listing for sale, where `salePriceMinor` is the figure and there
   * is no period at all.
   */
  pricePeriod?: PricePeriod;
  /**
   * To let, or for sale. The discriminator the whole product turns on.
   *
   * Optional so the seed catalogue, which predates the distinction, still
   * type-checks; absent reads as "rent", which is what every seed row is.
   */
  intent?: ListingIntent;
  /** Asking price in kobo. Present only when `intent` is "sale". */
  salePriceMinor?: number;
  /** The lister will discuss the figure. Rendered as a chip, never as a discount. */
  negotiable?: boolean;
  /**
   * What it actually costs to move in, in kobo, as the lister stated it.
   *
   * THE NUMBER PEOPLE SHOP ON in the Nigerian rent market, where a 4.5m yearly
   * rent routinely means 7m at the door once caution, agency, legal and
   * agreement fees are counted. Absent when the lister named no parts and no
   * total, which the UI renders as unstated rather than as zero.
   */
  moveInCostMinor?: number;
  /** True when `moveInCostMinor` is the lister's own total rather than a sum of parts. */
  moveInCostStated?: boolean;
  cautionDepositMinor?: number;
  serviceChargeMinor?: number;
  serviceChargePeriod?: RentPeriod;
  agencyFeeMinor?: number;
  legalFeeMinor?: number;
  agreementFeeMinor?: number;
  /** Shortest tenancy the lister accepts, in months. */
  minimumTenancyMonths?: number;
  /** ISO date the property can be occupied from. */
  availableFrom?: string;
  furnished?: Furnishing;
  /** The title a buyer would be taking. Present on sale listings that state one. */
  tenure?: LandTenure;
  saleStatus?: SaleStatus;
  yearBuilt?: number;
  condition?: BuildCondition;
  /** Floor area in square metres. A decimal, and the only non-integer here. */
  sizeSqm?: number;
  toilets?: number;
  parkingSpaces?: number;
  floor?: number;
  totalFloors?: number;
  /**
   * Walkthrough video URLs, best first. Empty rather than absent when the
   * listing has none, so a reader never has to test for undefined.
   */
  videos?: { url: string; posterUrl: string | null; durationSeconds: number | null }[];
  /**
   * When somebody from RentMe stood in the property. Not the same claim as
   * `verified`, which only says the lister was admitted.
   */
  inspectedAt?: string;
  /** When the stated address was checked against the pin. */
  addressVerifiedAt?: string;
  /**
   * Where the listing comes from. There is one answer and it is "rentme":
   * inventory listed on this platform by a person on this platform.
   */
  source?: "rentme";
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
   * price. Absent where the host has not answered, and rendered as unanswered
   * rather than as good news.
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
   * To let, or for sale. Absent means both, which is the honest default for a
   * marketplace that does all three of renting, buying and selling: somebody
   * who has not said which market they are in should see the whole catalogue.
   */
  intent?: ListingIntent;
  /**
   * Budget floor and ceiling in MINOR UNITS (kobo), matched against
   * `priceMinor` in its own period: per night for stays, per year for rentals,
   * per head for restaurants and experiences. A listing that carries no real
   * price is excluded the moment either bound is asked for, because nothing
   * can promise it fits a budget.
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
  /** Only listings whose owner has passed the verification ladder. */
  verifiedOnly?: boolean;
  /**
   * Light and water: the two questions asked here before the price.
   *
   * All three are **strict**, and that is the point rather than an oversight.
   * A listing whose host has not answered is excluded the moment one of these
   * is asked for, because "we do not know" cannot be shown to somebody who
   * asked for a generator. A listing whose host skipped these questions never
   * satisfies one of them, which is correct: nobody but the host can promise a
   * borehole.
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
 * There is nothing to decide any more. This carried one option, `partners`,
 * which told the repository whether to spend a billed third-party request on
 * top of the database query. Third-party inventory is gone, so every search is
 * one Postgres query and the option cannot change anything.
 *
 * The shape is kept, and `partners` with it, only because callers outside this
 * layer still pass it and removing the field would break their build rather
 * than their behaviour. It is read by nobody. Delete the call sites, then
 * delete this.
 */
export type ListingSearchOptions = {
  /** Ignored. Retained so existing call sites still compile. */
  partners?: boolean;
};

export interface ListingRepository {
  /** True when the results carry no pagination cursor behind them. */
  readonly isSeed: boolean;
  recommended(limit?: number): Promise<Listing[]>;
  /** Filtered catalogue lookup for the discovery surface. */
  search(filter?: ListingSearchFilter, opts?: ListingSearchOptions): Promise<Listing[]>;
  /** Single listing lookup for the detail page. Resolves null when unknown. */
  byId(id: string): Promise<Listing | null>;
}
