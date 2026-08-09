import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { memo } from "../cache/memo";
import type { Database } from "../supabase/database.types";
import { SUPABASE_URL } from "../supabase/env";
import { createClient } from "../supabase/server";
import { diversePick, matchesFilter } from "./filter";
import {
  headlinePrice,
  moveInTotal,
  type BuildCondition,
  type Furnishing,
  type LandTenure,
  type RentPeriod,
  type SaleStatus,
} from "./pricing";
import type {
  Listing,
  ListingKind,
  ListingRepository,
  ListingSearchFilter,
  ListingSearchOptions,
} from "./types";

/**
 * The platform catalogue, read from Postgres.
 *
 * Public reads see PUBLISHED listings only, which is enforced by RLS rather
 * than by this file: the policy is the authority, the query simply asks for
 * what it needs. Every listing that comes back was listed on this platform by
 * a person on this platform, so it carries source "rentme". There is no other
 * source and there is not going to be one.
 *
 * Money stays integer kobo end to end. Which of the three money stories a row
 * leads with (an asking price, a nightly rate, an annual rent) is decided by
 * `headlinePrice` in ./pricing, once, so a card and a map pin cannot disagree.
 * No conversion happens anywhere in this mapping.
 *
 * Query shape, deliberately flat: one listings query with photos and amenity
 * joins embedded, one aggregate query for reviews, and two tiny reference
 * tables (states, amenities) cached in process. No per-listing round trips.
 *
 * Nothing here throws. Every path returns empty or null on failure so the
 * merged repository can fall back to the seed catalogue and discovery keeps
 * rendering.
 */

const PHOTO_BUCKET = "listing-photos";
/**
 * Walkthrough videos. PRIVATE, unlike listing-photos, and read through a
 * short-lived signed URL.
 *
 * A walkthrough is the strongest evidence a listing is real that a lister can
 * supply without an inspection, which is exactly what makes it the most
 * valuable thing on this platform to steal: a continuous walk through a real
 * Lagos flat, lifted from a public CDN, is what turns a fake listing on
 * somebody else's site into a convincing one. A photograph is trivially stolen
 * anyway and the bucket for those stays public; the video is not handed out.
 *
 * The bucket also carries a 50MB ceiling and a MIME allowlist in Postgres, so
 * the size and type rules hold against a caller that skips the server action.
 */
export const VIDEO_BUCKET = "listing-videos";

/** How long a walkthrough URL stays good. Long enough to watch it twice. */
const VIDEO_URL_SECONDS = 3600;

/** How many published listings one catalogue read pulls, at most. */
const CATALOGUE_LIMIT = 200;

/**
 * How much wider than its output `recommended` reads.
 *
 * `diversePick` alternates between property kinds, so a pool the size of the
 * ask returns whatever order the catalogue was already in. Ten times the ask is
 * wider than the six kinds the mapping produces and is a fifth of what reading
 * the whole catalogue page cost.
 */
const RECOMMENDED_POOL_FACTOR = 10;

/**
 * The row ceiling for one catalogue read.
 *
 * A caller may ask for fewer than the catalogue limit and never for more: the
 * limit is the protection against a single read pulling an unbounded page, and
 * an option must not be able to raise it. A nonsense request (zero, negative,
 * fractional, NaN) falls back to the ceiling rather than to nothing, because
 * the failure mode of a bad number should be an ordinary page, not an empty
 * discovery surface.
 */
function rowCap(requested: number | undefined): number {
  if (requested === undefined || !Number.isFinite(requested)) return CATALOGUE_LIMIT;
  const whole = Math.floor(requested);
  if (whole < 1) return CATALOGUE_LIMIT;
  return Math.min(whole, CATALOGUE_LIMIT);
}

/** Reference tables barely change, so they are cached for the process. */
const REFERENCE_TTL_MS = 600_000;

type Client = SupabaseClient<Database>;

/**
 * `states` code to name, and `amenities` id to code.
 *
 * Both tables are static reference data (37 and 15 rows live today) and both
 * are readable by anyone, so the memo holds one copy per instance rather than
 * one per request. They went through `lib/cache/memo` when that helper landed:
 * the behaviour is the same as the hand-rolled caches they replaced, except a
 * failed refresh now keeps the last good map instead of replacing it with an
 * empty one, and three requests arriving as the TTL expires make one query
 * between them rather than three.
 *
 * The loader builds its own client rather than borrowing the caller's. A cache
 * shared across requests must not close over a request-scoped, cookie-bound
 * client: the first caller's client would outlive their request and every later
 * reader would be refreshing reference data through a session that has gone.
 */
const statesMemo = memo<Map<string, string>>({
  ttlMs: REFERENCE_TTL_MS,
  empty: new Map(),
  load: async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("states").select("code, name");
    if (error || !data) throw new Error("states unavailable");
    return new Map(data.map((row) => [row.code, row.name]));
  },
});

const amenitiesMemo = memo<Map<string, string>>({
  ttlMs: REFERENCE_TTL_MS,
  empty: new Map(),
  load: async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("amenities").select("id, code");
    if (error || !data) throw new Error("amenities unavailable");
    return new Map(data.map((row) => [row.id, row.code]));
  },
});

/**
 * The columns and joins a listing card and a listing detail page need.
 *
 * THE WALKTHROUGH JOIN IS NOT IN HERE, and the reason is a round trip rather
 * than a few bytes. `listing_videos` holds a private storage path, so every
 * path that comes back has to be signed, and signing is an HTTP call to
 * Supabase Storage for the whole page. A catalogue read was therefore paying a
 * storage round trip on top of its database query to produce signed URLs that
 * nothing renders: `Listing.videos` is declared on the domain type, populated
 * here, and consumed by no component in the product.
 *
 * Nothing is deleted, because MED-2 and P-11 both want walkthroughs. They moved
 * to the one read that will render them, `byId`, which is the listing detail
 * page. A list surface has no player on it and never will.
 */
const LISTING_SELECT = `
  id,
  title,
  property_type,
  listing_intent,
  rent_amount_minor,
  rent_period,
  rent_negotiable,
  rate_minor,
  rate_period,
  sale_price_minor,
  price_negotiable,
  caution_deposit_minor,
  service_charge_minor,
  service_charge_period,
  agency_fee_minor,
  legal_fee_minor,
  agreement_fee_minor,
  total_move_in_cost_minor,
  minimum_tenancy_months,
  available_from,
  furnished,
  tenure,
  sale_status,
  year_built,
  condition,
  size_sqm,
  toilets,
  parking_spaces,
  floor,
  total_floors,
  bedrooms,
  bathrooms,
  featured,
  area,
  city,
  state_code,
  latitude,
  longitude,
  published_at,
  created_at,
  address_verified_at,
  physically_inspected_at,
  power_grid,
  power_backup,
  power_backup_hours,
  water_supply,
  prepaid_meter,
  has_estate_access,
  listing_photos ( storage_path, position ),
  listing_amenities ( amenity_id )
`;

/**
 * The detail read: everything above, plus the walkthroughs.
 *
 * Written out rather than composed from `LISTING_SELECT`. The Supabase client
 * parses the select string AT THE TYPE LEVEL to work out the row shape it
 * returns, and it parses a literal type, so a composed or conditional select
 * degrades to `string` and takes the row typing down with it. Two literals cost
 * a duplicated column list; one composed one costs the type safety on every
 * column in it. `selects.test.ts` holds them to each other so the
 * duplication cannot drift.
 */
const LISTING_DETAIL_SELECT = `
  id,
  title,
  property_type,
  listing_intent,
  rent_amount_minor,
  rent_period,
  rent_negotiable,
  rate_minor,
  rate_period,
  sale_price_minor,
  price_negotiable,
  caution_deposit_minor,
  service_charge_minor,
  service_charge_period,
  agency_fee_minor,
  legal_fee_minor,
  agreement_fee_minor,
  total_move_in_cost_minor,
  minimum_tenancy_months,
  available_from,
  furnished,
  tenure,
  sale_status,
  year_built,
  condition,
  size_sqm,
  toilets,
  parking_spaces,
  floor,
  total_floors,
  bedrooms,
  bathrooms,
  featured,
  area,
  city,
  state_code,
  latitude,
  longitude,
  published_at,
  created_at,
  address_verified_at,
  physically_inspected_at,
  power_grid,
  power_backup,
  power_backup_hours,
  water_supply,
  prepaid_meter,
  has_estate_access,
  listing_photos ( storage_path, position ),
  listing_videos ( storage_path, poster_path, duration_seconds, position ),
  listing_amenities ( amenity_id )
`;

/** Exported for the spec that holds the two selects to each other. */
export const LISTING_SELECTS = {
  card: LISTING_SELECT,
  detail: LISTING_DETAIL_SELECT,
} as const;

type ListingRow = {
  id: string;
  title: string;
  property_type: string;
  listing_intent: string | null;
  rent_amount_minor: number | null;
  rent_period: string | null;
  rent_negotiable: boolean | null;
  rate_minor: number | null;
  rate_period: string | null;
  sale_price_minor: number | null;
  price_negotiable: boolean | null;
  caution_deposit_minor: number | null;
  service_charge_minor: number | null;
  service_charge_period: string | null;
  agency_fee_minor: number | null;
  legal_fee_minor: number | null;
  agreement_fee_minor: number | null;
  total_move_in_cost_minor: number | null;
  minimum_tenancy_months: number | null;
  available_from: string | null;
  furnished: string | null;
  tenure: string | null;
  sale_status: string | null;
  year_built: number | null;
  condition: string | null;
  size_sqm: number | string | null;
  toilets: number | null;
  parking_spaces: number | null;
  floor: number | null;
  total_floors: number | null;
  bedrooms: number;
  bathrooms: number;
  featured: boolean;
  power_grid: string | null;
  power_backup: string | null;
  power_backup_hours: number | null;
  water_supply: string | null;
  prepaid_meter: boolean | null;
  has_estate_access: boolean | null;
  area: string | null;
  city: string | null;
  state_code: string | null;
  latitude: number | null;
  longitude: number | null;
  published_at: string | null;
  created_at: string;
  address_verified_at: string | null;
  physically_inspected_at: string | null;
  listing_photos: { storage_path: string; position: number }[];
  listing_videos: {
    storage_path: string;
    poster_path: string | null;
    duration_seconds: number | null;
    position: number;
  }[] | null;
  listing_amenities: { amenity_id: string }[];
};

/** Category values the listings table can hold, mapped onto discovery kinds. */
const KIND_BY_PROPERTY_TYPE: Record<string, ListingKind> = {
  apartment: "apartment",
  hotel: "hotel",
  home: "home",
  villa: "villa",
  shortlet: "shortlet",
  rental: "rental",
  shop: "shop",
  office: "office",
  land: "land",
  /*
   * Restaurants somebody listed here.
   *
   * The category used to be filled by a Google Places feed, which meant no
   * verified badge, nobody to message and no way to hold anybody a table. The
   * feed is gone. A restaurant on RentMe is now what every other listing is:
   * a real place put up by a real person, with an owner to talk to and a
   * reservation that this platform actually holds.
   *
   * Priced per head rather than per night, which needs no column: the domain
   * type already states that restaurants and experiences ignore `pricePeriod`,
   * so the mapping below leaves it at "night" and every reader treats it as a
   * head price.
   *
   * There used to be a `YEARLY_KINDS` set here deciding which kinds were priced
   * by the year. It was dead: `headlinePrice` in ./pricing took over the period
   * decision so that a card and a map pin cannot disagree, and the set was left
   * behind still being cited by this comment. Removed.
   */
  restaurant: "restaurant",
};

/** Discovery kinds that live in the listings table at all. */
export function propertyTypeFor(kind: ListingKind): string | null {
  return kind in KIND_BY_PROPERTY_TYPE ? kind : null;
}

/** Public object URL for a stored photo, or the value itself if already a URL. */
function photoUrl(storagePath: string): string {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const path = storagePath.replace(/^\/+/, "").replace(new RegExp(`^${PHOTO_BUCKET}/`), "");
  const base = SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

/**
 * Signed URLs for every walkthrough on a page, in one call.
 *
 * One request for the whole page rather than one per video, because a catalogue
 * of twenty listings with a video each would otherwise be twenty round trips
 * before anything renders. A path that fails to sign is dropped rather than
 * rendered as a broken player.
 */
async function signVideos(
  supabase: Client,
  paths: string[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  if (paths.length === 0) return signed;
  try {
    const { data, error } = await supabase.storage
      .from(VIDEO_BUCKET)
      .createSignedUrls(paths, VIDEO_URL_SECONDS);
    if (error || !data) return signed;
    for (const entry of data) {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
  } catch {
    /* An unreachable storage service is a page without videos, not a page
       without listings. */
  }
  return signed;
}

function slugPart(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A readable, stable slug for links and analytics. The database has no slug
 * column yet, so it is derived from the title and locality; `byId` still
 * resolves listings by their uuid, which is what every link carries.
 */
function slugFor(row: ListingRow): string {
  const parts = [slugPart(row.title), slugPart(row.area ?? ""), slugPart(row.city ?? "")]
    .filter((p) => p.length > 0)
    .filter((p, i, all) => all.indexOf(p) === i);
  return parts.join("-") || row.id;
}

/** Deterministic gradient hue for the card fallback tile, 0 to 5. */
function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 6;
  return h;
}

async function getStateNames(): Promise<Map<string, string>> {
  return statesMemo.get();
}

async function getAmenityCodes(): Promise<Map<string, string>> {
  return amenitiesMemo.get();
}

/**
 * The row ceiling on the two secondary reads, and the reason it is dangerous.
 *
 * `listing_amenities` and `reviews` are both read in bulk for one page and both
 * were capped at 5,000 rows with no signal. A cap with no signal on a query
 * whose result is then AGGREGATED is not a performance limit, it is a silent
 * wrong answer: past the ceiling, a listing that genuinely carries every
 * requested amenity is dropped from the results, and a rating is averaged over
 * a truncated sample and presented as the listing's rating.
 *
 * The right fix is SQL, and it is BE-4 and BE-5: a `group by ... having count`
 * for the amenity set, and either an aggregate RPC or trigger-maintained
 * `rating_avg` and `review_count` columns for the reviews. Neither is a change
 * this layer can make, because both are migrations.
 *
 * What this layer CAN do is stop the failure being silent. `warnIfTruncated`
 * makes a hit ceiling a greppable line in the deployment log, so the first
 * signal is a warning rather than a support conversation about a listing that
 * does not appear in a search it satisfies. This is the whole lesson of CASE-1
 * applied one directory over: the bug was not that something failed, it was
 * that nothing said so.
 */
const JOIN_ROW_LIMIT = 5_000;

function warnIfTruncated(rows: number, what: string, scope: number): void {
  if (rows < JOIN_ROW_LIMIT) return;
  console.warn(
    `[catalogue] ${what} read hit the ${JOIN_ROW_LIMIT} row ceiling for ${scope} listings. ` +
      "Results past it are missing and the answer is incomplete. See RECOMMENDATIONS BE-4 and BE-5.",
  );
}

/**
 * Published listing ids carrying EVERY requested amenity, through the join
 * table.
 *
 * The join is the only place this can be answered in SQL: one filtered read of
 * `listing_amenities`, then the ids that turned up with the full set. It is
 * pushed down rather than filtered in memory because a listing that fails it
 * should never occupy one of the catalogue page's rows.
 *
 * Returns an empty list, never a throw: an unknown code, an unreachable table
 * or an empty reference table all mean "the database half contributes nothing",
 * and the seed half still answers with the same rule applied by the matcher.
 */
async function listingIdsWithAllAmenities(
  supabase: Client,
  codes: string[],
): Promise<string[]> {
  try {
    const codeById = await getAmenityCodes();
    const idByCode = new Map<string, string>();
    for (const [id, code] of codeById) idByCode.set(code, id);

    const wanted: string[] = [];
    for (const code of codes) {
      const id = idByCode.get(code);
      if (!id) return [];
      wanted.push(id);
    }
    if (wanted.length === 0) return [];

    const { data, error } = await supabase
      .from("listing_amenities")
      .select("listing_id, amenity_id")
      .in("amenity_id", wanted)
      .limit(JOIN_ROW_LIMIT);
    if (error || !data) return [];
    warnIfTruncated(data.length, "listing_amenities", wanted.length);

    const found = new Map<string, Set<string>>();
    for (const row of data) {
      const set = found.get(row.listing_id) ?? new Set<string>();
      set.add(row.amenity_id);
      found.set(row.listing_id, set);
    }
    const out: string[] = [];
    for (const [listingId, set] of found) {
      if (set.size === wanted.length) out.push(listingId);
    }
    return out;
  } catch {
    return [];
  }
}

/** Rating average and count per listing, in one query for the whole page. */
async function getReviewStats(
  supabase: Client,
  listingIds: string[],
): Promise<Map<string, { rating: number; count: number }>> {
  const stats = new Map<string, { rating: number; count: number }>();
  if (listingIds.length === 0) return stats;
  const { data, error } = await supabase
    .from("reviews")
    .select("listing_id, rating")
    .in("listing_id", listingIds)
    .limit(JOIN_ROW_LIMIT);
  if (error || !data) return stats;
  warnIfTruncated(data.length, "reviews", listingIds.length);

  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of data) {
    const entry = totals.get(row.listing_id) ?? { sum: 0, count: 0 };
    entry.sum += row.rating;
    entry.count += 1;
    totals.set(row.listing_id, entry);
  }
  for (const [id, entry] of totals) {
    stats.set(id, {
      rating: Math.round((entry.sum / entry.count) * 10) / 10,
      count: entry.count,
    });
  }
  return stats;
}

function mapRow(
  row: ListingRow,
  stateNames: Map<string, string>,
  amenityCodes: Map<string, string>,
  stats: Map<string, { rating: number; count: number }>,
  signedVideos: Map<string, string>,
): Listing {
  const kind = KIND_BY_PROPERTY_TYPE[row.property_type] ?? "home";
  const stat = stats.get(row.id);
  const photos = [...row.listing_photos]
    .sort((a, b) => a.position - b.position)
    .map((p) => photoUrl(p.storage_path));
  const amenities = row.listing_amenities
    .map((a) => amenityCodes.get(a.amenity_id))
    .filter((code): code is string => Boolean(code))
    .sort();
  const videos = [...(row.listing_videos ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((v) => {
      const url = signedVideos.get(v.storage_path);
      return url === undefined
        ? null
        : {
            url,
            /* The poster still lives in the PUBLIC photo bucket, so it needs no
               signature and keeps working after the video URL expires. A card
               that shows a frame and asks you to tap is the right shape here. */
            posterUrl: v.poster_path ? photoUrl(v.poster_path) : null,
            durationSeconds: v.duration_seconds,
          };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const headline = headlinePrice(row);
  const moveIn = moveInTotal(row);

  return {
    id: row.id,
    slug: slugFor(row),
    title: row.title,
    kind,
    area: row.area ?? row.city ?? "",
    city: row.city ?? "",
    state: (row.state_code ? stateNames.get(row.state_code) : undefined) ?? row.state_code ?? "",
    /* Both columns are nullable and the wizard does not force a pin, so a row
       carries a coordinate or it carries neither. A half pair is refused rather
       than mapped, because a latitude with no longitude places a property on
       the Gulf of Guinea. */
    ...(row.latitude !== null && row.longitude !== null
      ? { lat: row.latitude, lng: row.longitude }
      : {}),
    /* The headline figure in kobo, whichever of the three markets this row is
       in. A sale carries its asking price here AND in salePriceMinor, because
       every card in discovery prints priceMinor and a sale that printed zero
       would read as free. */
    priceMinor: headline.minor,
    currency: "NGN",
    intent: row.listing_intent === "sale" ? "sale" : "rent",
    ...(headline.kind === "sale" ? {} : { pricePeriod: headline.period }),
    ...(headline.kind === "sale" ? { salePriceMinor: headline.minor } : {}),
    negotiable:
      row.listing_intent === "sale"
        ? (row.price_negotiable ?? false)
        : (row.rent_negotiable ?? false),
    /* What it actually costs to move in. Carried only for a rent listing, and
       only when somebody stated something: an unstated total renders as
       unstated, never as zero, because "no fees" and "we did not say" are
       different promises. */
    ...(row.listing_intent !== "sale" && (moveIn.stated || moveIn.minor > 0)
      ? { moveInCostMinor: moveIn.minor, moveInCostStated: moveIn.stated }
      : {}),
    ...(row.caution_deposit_minor === null
      ? {}
      : { cautionDepositMinor: Number(row.caution_deposit_minor) }),
    ...(row.service_charge_minor === null
      ? {}
      : { serviceChargeMinor: Number(row.service_charge_minor) }),
    ...(row.service_charge_period
      ? { serviceChargePeriod: row.service_charge_period as RentPeriod }
      : {}),
    ...(row.agency_fee_minor === null ? {} : { agencyFeeMinor: Number(row.agency_fee_minor) }),
    ...(row.legal_fee_minor === null ? {} : { legalFeeMinor: Number(row.legal_fee_minor) }),
    ...(row.agreement_fee_minor === null
      ? {}
      : { agreementFeeMinor: Number(row.agreement_fee_minor) }),
    ...(row.minimum_tenancy_months === null
      ? {}
      : { minimumTenancyMonths: row.minimum_tenancy_months }),
    ...(row.available_from ? { availableFrom: row.available_from } : {}),
    ...(row.furnished ? { furnished: row.furnished as Furnishing } : {}),
    ...(row.tenure ? { tenure: row.tenure as LandTenure } : {}),
    ...(row.sale_status ? { saleStatus: row.sale_status as SaleStatus } : {}),
    ...(row.year_built === null ? {} : { yearBuilt: row.year_built }),
    ...(row.condition ? { condition: row.condition as BuildCondition } : {}),
    /* size_sqm is the one numeric column on this table rather than an integer,
       because a plot is measured in fractions of a square metre and rounding it
       to a whole number would misstate land. PostgREST hands a numeric back as
       a string to preserve its precision, so it is parsed rather than trusted
       to already be a number. */
    ...(row.size_sqm === null || row.size_sqm === undefined
      ? {}
      : { sizeSqm: Number(row.size_sqm) }),
    ...(row.toilets === null ? {} : { toilets: row.toilets }),
    ...(row.parking_spaces === null ? {} : { parkingSpaces: row.parking_spaces }),
    ...(row.floor === null ? {} : { floor: row.floor }),
    ...(row.total_floors === null ? {} : { totalFloors: row.total_floors }),
    ...(row.physically_inspected_at ? { inspectedAt: row.physically_inspected_at } : {}),
    ...(row.address_verified_at ? { addressVerifiedAt: row.address_verified_at } : {}),
    source: "rentme",
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    utilities: {
      ...(row.power_grid ? { powerGrid: row.power_grid as NonNullable<Listing["utilities"]>["powerGrid"] } : {}),
      ...(row.power_backup
        ? { powerBackup: row.power_backup as NonNullable<Listing["utilities"]>["powerBackup"] }
        : {}),
      ...(row.power_backup_hours === null ? {} : { powerBackupHours: row.power_backup_hours }),
      ...(row.water_supply
        ? { waterSupply: row.water_supply as NonNullable<Listing["utilities"]>["waterSupply"] }
        : {}),
      ...(row.prepaid_meter === null ? {} : { prepaidMeter: row.prepaid_meter }),
      hasEstateAccess: row.has_estate_access ?? false,
    },
    rating: stat?.rating ?? 0,
    reviewCount: stat?.count ?? 0,
    // First-party inventory is admitted through agent approval, so a published
    // listing is by definition a verified one.
    verified: true,
    /* Instant book is gone from the schema. The whole product moved from
       "reserve a room tonight" to "rent or buy a property", and no property in
       either of those markets changes hands without a person on both sides.
       The field stays on the domain type because the filter drawer and the card
       still read it; it is false for every database row, which is the truth. */
    instantBook: false,
    amenities,
    photos,
    videos,
    hue: hueFor(row.id),
  };
}

/** Map raw rows into listings, resolving references and review stats in bulk. */
async function mapRows(supabase: Client, rows: ListingRow[]): Promise<Listing[]> {
  if (rows.length === 0) return [];
  const [stateNames, amenityCodes, stats, signedVideos] = await Promise.all([
    getStateNames(),
    getAmenityCodes(),
    getReviewStats(
      supabase,
      rows.map((r) => r.id),
    ),
    signVideos(
      supabase,
      rows.flatMap((r) => (r.listing_videos ?? []).map((v) => v.storage_path)),
    ),
  ]);
  return rows.map((row) => mapRow(row, stateNames, amenityCodes, stats, signedVideos));
}

/**
 * Published listings by id, mapped for display. Used by the saved shortlist,
 * which holds listing ids rather than listings. One query, never a loop.
 */
export async function loadListingsByIds(
  supabase: Client,
  ids: string[],
): Promise<Map<string, Listing>> {
  const out = new Map<string, Listing>();
  if (ids.length === 0) return out;
  try {
    const { data, error } = await supabase
      .from("listings")
      // The shortlist renders cards, so no walkthroughs and no signing call.
      .select(LISTING_SELECT)
      .eq("status", "PUBLISHED")
      .in("id", ids);
    if (error || !data) return out;
    for (const listing of await mapRows(supabase, data as ListingRow[])) {
      out.set(listing.id, listing);
    }
    return out;
  } catch {
    return out;
  }
}

export class SupabaseListingRepository implements ListingRepository {
  readonly isSeed = false;

  /**
   * The published catalogue, newest and featured first.
   *
   * What runs where, and why:
   *
   *   In SQL   category, price floor and ceiling, bedroom, bathroom and guest
   *            minimums, instant book, and the amenity set through the
   *            `listing_amenities` join. Every one of them is a column
   *            predicate, so a row that cannot match must never be read, let
   *            alone occupy one of the page's rows.
   *   In memory  free text (the shared haystack, until a Postgres full text
   *            index exists) and verified-only, which needs no predicate here:
   *            RLS publishes admitted rows only and admission is what makes
   *            them verified, so every row this query can return already
   *            satisfies it. The shared matcher still enforces it so that the
   *            browser count and the server answer cannot disagree.
   *
   * The matcher runs over the results either way, so SQL is an optimisation
   * and never the authority: the two halves cannot disagree.
   */
  async search(
    filter: ListingSearchFilter = {},
    opts: ListingSearchOptions = {},
  ): Promise<Listing[]> {
    if (filter.kind && propertyTypeFor(filter.kind) === null) return [];
    try {
      const supabase = await createClient();

      // The amenity join is resolved first: with no listing carrying the whole
      // set there is nothing to ask the catalogue for.
      let amenityIds: string[] | null = null;
      if (filter.amenities && filter.amenities.length > 0) {
        amenityIds = await listingIdsWithAllAmenities(supabase, filter.amenities);
        if (amenityIds.length === 0) return [];
      }

      let query = supabase
        .from("listings")
        .select(LISTING_SELECT)
        .eq("status", "PUBLISHED");
      if (filter.kind) {
        const propertyType = propertyTypeFor(filter.kind);
        if (propertyType) {
          query = query.eq(
            "property_type",
            propertyType as Database["public"]["Enums"]["property_type"],
          );
        }
      }
      if (amenityIds) query = query.in("id", amenityIds);
      if (filter.intent) {
        query = query.eq(
          "listing_intent",
          filter.intent as Database["public"]["Enums"]["listing_intent"],
        );
      }

      /*
       * Budget, across three money columns rather than one.
       *
       * A row leads with an asking price, a nightly rate or a rent, and which
       * one it leads with is a property of the row rather than of the query, so
       * the predicate has to allow any of the three to satisfy the bound. An OR
       * of three AND groups does exactly that in one PostgREST call.
       *
       * This stays an optimisation and never the authority: `matchesFilter`
       * runs `headlinePrice` over every row that comes back and judges the one
       * figure the row actually leads with, so a listing whose rent fits the
       * budget but whose nightly rate does not is filtered out in memory. SQL
       * narrows, the matcher decides, and the two cannot disagree.
       */
      const wantsBudget =
        filter.minPriceMinor !== undefined || filter.maxPriceMinor !== undefined;
      if (wantsBudget) {
        const bounds = (column: string) => {
          const parts = [`${column}.gt.0`];
          if (filter.minPriceMinor !== undefined) {
            parts.push(`${column}.gte.${filter.minPriceMinor}`);
          }
          if (filter.maxPriceMinor !== undefined) {
            parts.push(`${column}.lte.${filter.maxPriceMinor}`);
          }
          return `and(${parts.join(",")})`;
        };
        query = query.or(
          [bounds("rent_amount_minor"), bounds("rate_minor"), bounds("sale_price_minor")].join(
            ",",
          ),
        );
      }
      if (filter.bedrooms !== undefined) query = query.gte("bedrooms", filter.bedrooms);
      if (filter.bathrooms !== undefined) query = query.gte("bathrooms", filter.bathrooms);
      /*
       * Party size and instant book are decided in memory now, and there is no
       * predicate to push down for either.
       *
       * `max_guests` and `instant_book` were dropped with the short-stay model.
       * The matcher still answers both: `sleeps` falls back to the
       * two-per-bedroom convention where no capacity is declared, which is now
       * every database row, and `instantBook` is false on every one of them.
       * Naming that here rather than deleting the branch silently, because the
       * filter drawer still offers both controls and a reader of this method is
       * entitled to know why they are missing from the SQL.
       */

      /*
       * Light and water, pushed down rather than filtered after the fact.
       *
       * `listings_power_idx` and `listings_water_idx` are partial indexes on
       * `status = 'PUBLISHED'`, which is the predicate already on this query,
       * so these three land on an index rather than a scan.
       *
       * The null half matters as much as the value half: a row where the host
       * never answered must not come back for somebody who asked for a
       * generator, and `neq` alone would not exclude it, because in SQL
       * `null <> 'NONE'` is null and a null predicate is not true. The
       * shared matcher runs afterwards and would catch it, but a predicate
       * that leans on a later pass to be correct is one refactor from being
       * wrong, so it is stated here too.
       */
      if (filter.powerBackup) {
        query = query.not("power_backup", "is", null).neq("power_backup", "NONE");
      }
      if (filter.powerBandA) query = query.eq("power_grid", "BAND_A");
      if (filter.waterSupply && filter.waterSupply.length > 0) {
        query = query.in("water_supply", filter.waterSupply);
      }

      const { data, error } = await query
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(rowCap(opts.limit));
      if (error || !data) return [];

      const listings = await mapRows(supabase, data as ListingRow[]);
      return listings.filter((l) => matchesFilter(l, filter));
    } catch {
      return [];
    }
  }

  /**
   * A short, varied rail. Six listings, and it used to read two hundred to find
   * them.
   *
   * `diversePick` alternates between property kinds, so it needs a pool wider
   * than its output or it simply returns the newest six. It does not need the
   * whole catalogue page. `RECOMMENDED_POOL_FACTOR` is the width of that pool
   * relative to the ask, and ten is comfortably more than the six kinds the
   * mapping can produce.
   *
   * The cap is an option rather than a filter for the reason `types.ts` gives:
   * it changes what the read costs and must never change which listings match.
   * That holds here because the rail promises "some good ones" rather than
   * "all of them", which is exactly the case the option is safe in.
   */
  async recommended(limit = 6): Promise<Listing[]> {
    const pool = await this.search({}, { limit: limit * RECOMMENDED_POOL_FACTOR });
    return diversePick(pool, limit);
  }

  async byId(id: string): Promise<Listing | null> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("listings")
        // The one surface a walkthrough belongs on, so it pays for the signing.
        .select(LISTING_DETAIL_SELECT)
        .eq("status", "PUBLISHED")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return null;
      const [listing] = await mapRows(supabase, [data as ListingRow]);
      return listing ?? null;
    } catch {
      return null;
    }
  }
}
