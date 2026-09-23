import type {
  AreaAskingRow,
  AreaCensus,
  AreaShare,
  AreaSuggestion,
  AreaUtilityFacts,
  Comparable,
  GateVerdict,
  ListingIntent,
  ListingPropertyType,
  SupplyCensus,
} from "./types";

/**
 * POSTGREST ROWS INTO PRODUCT SHAPES, AND WHY THIS IS ITS OWN FILE.
 *
 * ---------------------------------------------------------------------------
 * POSTGREST SENDS A bigint AS A STRING, AND EVERY FIGURE HERE IS A bigint.
 *
 * `low_minor`, `mid_minor`, `high_minor` and `price_minor` are integer kobo in
 * `bigint` columns, and JSON has no 64-bit integer, so PostgREST sends them as
 * JSON strings to avoid silently losing precision above 2^53. A caller that
 * reads them straight into a number field gets a string, and a string reaching
 * `Amount` renders NaN or the literal characters.
 *
 * That defect is invisible on this platform TODAY for exactly the reason the
 * SQL bug in `20260922223411_...` was invisible: the gate refuses every call,
 * so the answered branch that carries the figures is never taken. It would
 * appear the day the fifth real listing lands in one area, on the screen that
 * prints somebody's money.
 *
 * So the mapping is a pure function in its own module rather than a closure
 * inside a query, and `mapping.test.ts` feeds it the payload shape PostgREST
 * actually sends. The query layer is then only a round trip and a failure
 * mode, and the part that can be wrong in silence is the part under test.
 *
 * ---------------------------------------------------------------------------
 * EVERY COERCION FAILS TOWARDS A REFUSAL, NEVER TOWARDS A NUMBER.
 *
 * `asNullableNumber` returns null for anything it cannot read, and `gate.ts`
 * turns a null figure into a refusal rather than printing a zero. A zero naira
 * asking price is an invented figure, and it is the exact shape rule 15 is
 * about: a count the database cannot produce is not printed.
 */

/** A bigint arrives as a string. A missing value must never become zero. */
export function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * For counts and distances, where a missing value genuinely is none.
 *
 * Deliberately NOT used for money. A count of zero comparables is a true
 * statement about our data; a price of zero kobo is not a price.
 */
export function asCount(value: unknown): number {
  return asNullableNumber(value) ?? 0;
}

export function verdictFromRow(row: Record<string, unknown> | undefined): GateVerdict | null {
  if (!row) return null;
  return {
    outcome: row.outcome === "answered" ? "answered" : "refused",
    refusalCode: typeof row.refusal_code === "string" ? row.refusal_code : null,
    radiusM: asCount(row.radius_m),
    comparableCount: asCount(row.comparable_count),
    basis:
      row.basis === "per_sqm" || row.basis === "per_property" ? row.basis : null,
    lowMinor: asNullableNumber(row.low_minor),
    midMinor: asNullableNumber(row.mid_minor),
    highMinor: asNullableNumber(row.high_minor),
    dispersion: asNullableNumber(row.dispersion),
    confidence:
      row.confidence === "low" || row.confidence === "medium" || row.confidence === "high"
        ? row.confidence
        : null,
    medianAgeDays: asNullableNumber(row.median_age_days),
    medianDistanceM: asNullableNumber(row.median_distance_m),
    /* Postgres sends a uuid[] as a JSON array, but a literal `{a,b}` arrives
       from some drivers as a string. Anything that is not an array of strings
       becomes an empty list rather than a list of one wrong thing. */
    comparableIds: Array.isArray(row.comparable_ids)
      ? row.comparable_ids.filter((id): id is string => typeof id === "string")
      : [],
  };
}

export function supplyFromRow(row: Record<string, unknown> | undefined): SupplyCensus | null {
  if (!row) return null;
  return {
    realCount: asCount(row.real_count),
    demoCount: asCount(row.demo_count),
    staleRealCount: asCount(row.stale_real_count),
  };
}

export function comparableFromRow(row: Record<string, unknown>): Comparable {
  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    area: typeof row.area === "string" ? row.area : null,
    city: typeof row.city === "string" ? row.city : null,
    bedrooms: asCount(row.bedrooms),
    bathrooms: asCount(row.bathrooms),
    sizeSqm: asNullableNumber(row.size_sqm),
    publishedAt: typeof row.published_at === "string" ? row.published_at : "",
    ageDays: asCount(row.age_days),
    distanceM: asCount(row.distance_m),
    priceMinor: asCount(row.price_minor),
    priceBasis: typeof row.price_basis === "string" ? row.price_basis : "",
    pricePerSqmMinor: asNullableNumber(row.price_per_sqm_minor),
  };
}

export function areaRowFromRow(row: Record<string, unknown>): AreaAskingRow {
  return {
    scope: row.scope === "area" || row.scope === "city" ? row.scope : "state",
    propertyType: row.property_type as ListingPropertyType,
    bedrooms: asCount(row.bedrooms),
    listingCount: asCount(row.listing_count),
    p25Minor: asCount(row.p25_minor),
    medianMinor: asCount(row.median_minor),
    p75Minor: asCount(row.p75_minor),
    sizedCount: asCount(row.sized_count),
    medianPerSqmMinor: asNullableNumber(row.median_per_sqm_minor),
    oldestAt: typeof row.oldest_at === "string" ? row.oldest_at : "",
    newestAt: typeof row.newest_at === "string" ? row.newest_at : "",
  };
}

export function areaCensusFromRow(row: Record<string, unknown> | undefined): AreaCensus | null {
  if (!row) return null;
  return {
    realCount: asCount(row.real_count),
    demoCount: asCount(row.demo_count),
    locatedCount: asCount(row.located_count),
    sizedCount: asCount(row.sized_count),
  };
}

export function utilityFactsFromRow(
  row: Record<string, unknown> | undefined,
): AreaUtilityFacts | null {
  if (!row) return null;
  return {
    listingCount: asCount(row.listing_count),
    powerGrid: typeof row.power_grid === "string" ? row.power_grid : null,
    powerGridCount: asNullableNumber(row.power_grid_count),
    powerBackup: typeof row.power_backup === "string" ? row.power_backup : null,
    powerBackupCount: asNullableNumber(row.power_backup_count),
    waterSupply: typeof row.water_supply === "string" ? row.water_supply : null,
    waterSupplyCount: asNullableNumber(row.water_supply_count),
    prepaidMeterCount: asCount(row.prepaid_meter_count),
    prepaidMeterKnown: asCount(row.prepaid_meter_known),
    estateAccessCount: asCount(row.estate_access_count),
    estateAccessKnown: asCount(row.estate_access_known),
  };
}

export function suggestionFromRow(row: Record<string, unknown>): AreaSuggestion {
  return {
    area: typeof row.area === "string" ? row.area : "",
    city: typeof row.city === "string" ? row.city : null,
    listingCount: asCount(row.listing_count),
  };
}

/**
 * ONE SHARE ROW, AND THE THREE FIGURES DECIDE WHETHER IT IS A CARD AT ALL.
 *
 * Null rather than a shape with holes in it. `low_minor`, `mid_minor` and
 * `high_minor` are `bigint` columns, so PostgREST sends them as JSON STRINGS,
 * and a string reaching `formatMoneyGlance` prints NaN on the one artefact in
 * this product that leaves it and gets forwarded. `asNullableNumber` is the
 * only reader of them and it fails towards null, so a row that cannot be read
 * as money becomes no card rather than a card with a broken number on it.
 *
 * THE SCOPE IS NARROWED AND NEVER CAST. `price_check_share_scope` has two
 * labels today and neither is a property. If a third ever appeared, a cast
 * would put it straight onto a type whose union has two members and the card
 * would render whatever it turned out to be. An unrecognised scope is not a
 * card, and `null` is what this returns for one.
 *
 * `created_by` IS NOT READ HERE AND THERE IS NOWHERE TO PUT IT. A card says
 * what an area is asking; it never says who asked. `anon` and `authenticated`
 * hold no grant on that column (`20260923094710`), so a row read through the
 * caller's own client does not carry it at all.
 */
export function shareFromRow(row: Record<string, unknown> | undefined): AreaShare | null {
  if (!row) return null;
  if (typeof row.id !== "string" || row.id === "") return null;
  if (row.scope !== "area" && row.scope !== "area_and_type") return null;
  if (row.listing_intent !== "rent" && row.listing_intent !== "sale") return null;

  const lowMinor = asNullableNumber(row.low_minor);
  const midMinor = asNullableNumber(row.mid_minor);
  const highMinor = asNullableNumber(row.high_minor);
  const listingCount = asNullableNumber(row.listing_count);
  if (lowMinor === null || midMinor === null || highMinor === null) return null;
  /* The database refuses fewer than three. A row that says otherwise is a row
     this reader does not understand, and a card is not minted from it. */
  if (listingCount === null || listingCount < 3) return null;

  return {
    id: row.id,
    scope: row.scope,
    stateCode: typeof row.state_code === "string" ? row.state_code : "",
    lgaCode: typeof row.lga_code === "string" ? row.lga_code : null,
    area: typeof row.area === "string" && row.area.trim() !== "" ? row.area : null,
    propertyType:
      typeof row.property_type === "string"
        ? (row.property_type as ListingPropertyType)
        : null,
    listingIntent: row.listing_intent as ListingIntent,
    /* Zero is a studio and is a real answer, so this is nullable rather than
       counted: `asCount` would turn "no bedroom count on this card" into
       "studio", which is a different card. */
    bedrooms: asNullableNumber(row.bedrooms),
    lowMinor,
    midMinor,
    highMinor,
    listingCount,
    oldestAt: typeof row.oldest_at === "string" ? row.oldest_at : null,
    newestAt: typeof row.newest_at === "string" ? row.newest_at : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}
