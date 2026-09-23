/**
 * The shapes Price Check passes between the database, the server and the
 * screen. No copy, no queries, no side effects: every other module in this
 * folder imports from here so that the client half and the server half cannot
 * disagree about what a verdict is.
 */

/** Exactly the four types the product answers for. See `gate.ts`. */
export type PriceCheckPropertyType = "apartment" | "home" | "shop" | "office";

/** Every type the database holds, because the refusal has to name the rest. */
export type ListingPropertyType =
  | PriceCheckPropertyType
  | "hotel"
  | "villa"
  | "shortlet"
  | "rental"
  | "land"
  | "restaurant";

export type ListingIntent = "rent" | "sale";
export type RentPeriod = "month" | "quarter" | "year";
export type ConfidenceBand = "low" | "medium" | "high";
export type EstimateBasis = "per_sqm" | "per_property";

/**
 * What the person told us, and nothing we guessed.
 *
 * THE USER STATES THE FACTS. We hold nothing that maps an address to a
 * building, so a pre-filled guess would be four invented numbers with the
 * reader asked to take ownership of them. The only honest pre-fill is an
 * existing listing, where it is a read rather than a guess, and that is what
 * `fromListing` marks.
 */
export type PriceCheckSubject = {
  /** Null until the pin is dropped. The ladder may be stopped at any rung. */
  lat: number | null;
  lng: number | null;
  stateCode: string;
  /** `public.local_governments.code`. The ladder asks; listings do not carry it. */
  lgaCode: string | null;
  /** Free text, matched case-insensitively against `listings.area`. */
  area: string | null;
  city: string | null;
  propertyType: ListingPropertyType;
  intent: ListingIntent;
  /** Annual only for rent: see `unsupported_period`. */
  rentPeriod: RentPeriod;
  bedrooms: number | null;
  bathrooms: number | null;
  /** Optional, never inferred from the bedroom count. */
  sizeSqm: number | null;
  /**
   * "Anything else that helps, like the estate name or the nearest landmark."
   * STORED NOWHERE AND PARSED NEVER. It lives in the form's own state for the
   * person's recall while they are on the screen, and no table in this feature
   * has a column for it.
   */
  hint: string | null;
  /** Set only when the subject IS a listing, where a pre-fill is a read. */
  fromListingId: string | null;
};

/** One row of `public.comparable_listings`, as the screen draws it. */
export type Comparable = {
  id: string;
  title: string;
  area: string | null;
  city: string | null;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number | null;
  publishedAt: string;
  ageDays: number;
  distanceM: number;
  /** Integer kobo. ASKING or ADVERTISED, never sold. */
  priceMinor: number;
  /** `asking_sale` or `advertised_rent_year`. Printed, not inferred. */
  priceBasis: string;
  pricePerSqmMinor: number | null;
};

/** Exactly what `public.estimate_value` returns, renamed to house style. */
export type GateVerdict = {
  outcome: "answered" | "refused";
  refusalCode: string | null;
  radiusM: number;
  comparableCount: number;
  basis: EstimateBasis | null;
  lowMinor: number | null;
  midMinor: number | null;
  highMinor: number | null;
  dispersion: number | null;
  confidence: ConfidenceBand | null;
  medianAgeDays: number | null;
  medianDistanceM: number | null;
  comparableIds: string[];
};

/**
 * `public.comparable_supply_near`. Three counts and never a price.
 *
 * It exists because `is_demo = false` sits inside the comparables predicate,
 * which makes `demo_only`, `stale` and `no_comparables` identical from
 * outside the gate. Printing the wrong one of those is printing a guess about
 * our own data.
 */
export type SupplyCensus = {
  realCount: number;
  demoCount: number;
  staleRealCount: number;
};

/** One row of `public.area_asking_summary`. */
export type AreaAskingRow = {
  scope: "area" | "city" | "state";
  propertyType: ListingPropertyType;
  bedrooms: number;
  listingCount: number;
  p25Minor: number;
  medianMinor: number;
  p75Minor: number;
  /** How many of `listingCount` stated a size. Printed beside every per sqm figure. */
  sizedCount: number;
  medianPerSqmMinor: number | null;
  oldestAt: string;
  newestAt: string;
};

/** `public.area_supply_census`. */
export type AreaCensus = {
  realCount: number;
  demoCount: number;
  locatedCount: number;
  sizedCount: number;
};

/**
 * `public.area_utility_facts`. The neighbourhood power and water panel.
 *
 * Every figure carries the count it came from. A percentage over eleven
 * listings is a figure pretending to be a survey.
 */
export type AreaUtilityFacts = {
  listingCount: number;
  powerGrid: string | null;
  powerGridCount: number | null;
  powerBackup: string | null;
  powerBackupCount: number | null;
  waterSupply: string | null;
  waterSupplyCount: number | null;
  prepaidMeterCount: number;
  prepaidMeterKnown: number;
  estateAccessCount: number;
  estateAccessKnown: number;
};

/** One suggestion from `public.area_suggestions`. */
export type AreaSuggestion = { area: string; city: string | null; listingCount: number };

/**
 * ONE ROW OF `public.price_check_shares`, AS A CARD READS IT.
 *
 * NOTE WHAT IS NOT ON THIS TYPE AND CANNOT BE. There is no address, no
 * latitude, no longitude, no listing id and no free text hint, because there
 * is no column for any of them on that table and there may not be. The scope
 * enum carries two labels, `area` and `area_and_type`, and neither of them is
 * a property, so a property-scoped card is unrepresentable rather than merely
 * forbidden. The absence is the enforcement, exactly as it is for
 * `PriceCheckSubject.hint`.
 *
 * `createdBy` is not on it either, and that absence is younger and was found
 * by probe: the table grant covered every column, so anybody holding a share
 * id could read the uuid of whoever minted the card. The grant is now a column
 * list without it (`20260923094710`), and this type has no field to put it in
 * even if that changed back.
 */
export type AreaShare = {
  id: string;
  /** Two values and neither is a property. See above. */
  scope: "area" | "area_and_type";
  stateCode: string;
  lgaCode: string | null;
  /** A NEIGHBOURHOOD NAME, never a street address: a check constraint refuses
      anything address-shaped. Null on a state-wide card. */
  area: string | null;
  /** Null on an `area` scoped card, by check constraint. */
  propertyType: ListingPropertyType | null;
  listingIntent: ListingIntent;
  /** Null on an `area` scoped card. Zero is a studio and is a real answer. */
  bedrooms: number | null;
  /** Integer kobo. ASKING, never sold, and never a single point estimate. */
  lowMinor: number;
  midMinor: number;
  highMinor: number;
  /** At least three, by check constraint: a card cannot be minted from two. */
  listingCount: number;
  oldestAt: string | null;
  newestAt: string | null;
  createdAt: string;
};
