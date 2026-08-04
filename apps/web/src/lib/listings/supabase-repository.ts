import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { SUPABASE_URL } from "../supabase/env";
import { createClient } from "../supabase/server";
import { diversePick, matchesFilter } from "./filter";
import type { Listing, ListingKind, ListingRepository, ListingSearchFilter } from "./types";

/**
 * The platform catalogue, read from Postgres.
 *
 * Public reads see PUBLISHED listings only, which is enforced by RLS rather
 * than by this file: the policy is the authority, the query simply asks for
 * what it needs. Every listing that comes back is first-party agent inventory,
 * so it carries source "rentme" and the verified badge; partner stock arrives
 * later through the provider layer and is not this repository's business.
 *
 * Money stays integer kobo end to end. `price_per_night_minor` is the unit
 * price per `price_period` unit (per night for stays, per year for rentals),
 * which is exactly the convention the seed catalogue uses for `priceMinor`
 * plus `pricePeriod`, so no conversion happens anywhere in the mapping.
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

/** How many published listings one catalogue read pulls. */
const CATALOGUE_LIMIT = 200;

/** Reference tables barely change, so they are cached for the process. */
const REFERENCE_TTL_MS = 600_000;

type Cached<T> = { value: T; expires: number };

let statesCache: Cached<Map<string, string>> | null = null;
let amenitiesCache: Cached<Map<string, string>> | null = null;

type Client = SupabaseClient<Database>;

/** The columns and joins one listing card and one detail page need. */
const LISTING_SELECT = `
  id,
  title,
  property_type,
  price_period,
  price_per_night_minor,
  bedrooms,
  bathrooms,
  max_guests,
  instant_book,
  featured,
  area,
  city,
  state_code,
  published_at,
  created_at,
  listing_photos ( storage_path, position ),
  listing_amenities ( amenity_id )
`;

type ListingRow = {
  id: string;
  title: string;
  property_type: string;
  price_period: string;
  price_per_night_minor: number;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  instant_book: boolean;
  featured: boolean;
  area: string | null;
  city: string | null;
  state_code: string | null;
  published_at: string | null;
  created_at: string;
  listing_photos: { storage_path: string; position: number }[];
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
};

/** Kinds priced by the year rather than by the night. */
const YEARLY_KINDS: ReadonlySet<ListingKind> = new Set<ListingKind>([
  "rental",
  "shop",
  "office",
  "land",
]);

/** Discovery kinds that live in the listings table at all. */
function propertyTypeFor(kind: ListingKind): string | null {
  return kind in KIND_BY_PROPERTY_TYPE ? kind : null;
}

/** Public object URL for a stored photo, or the value itself if already a URL. */
function photoUrl(storagePath: string): string {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const path = storagePath.replace(/^\/+/, "").replace(new RegExp(`^${PHOTO_BUCKET}/`), "");
  const base = SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
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

async function getStateNames(supabase: Client): Promise<Map<string, string>> {
  const now = Date.now();
  if (statesCache && statesCache.expires > now) return statesCache.value;
  const map = new Map<string, string>();
  const { data, error } = await supabase.from("states").select("code, name");
  if (!error && data) for (const row of data) map.set(row.code, row.name);
  statesCache = { value: map, expires: now + REFERENCE_TTL_MS };
  return map;
}

async function getAmenityCodes(supabase: Client): Promise<Map<string, string>> {
  const now = Date.now();
  if (amenitiesCache && amenitiesCache.expires > now) return amenitiesCache.value;
  const map = new Map<string, string>();
  const { data, error } = await supabase.from("amenities").select("id, code");
  if (!error && data) for (const row of data) map.set(row.id, row.code);
  amenitiesCache = { value: map, expires: now + REFERENCE_TTL_MS };
  return map;
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
    const codeById = await getAmenityCodes(supabase);
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
      .limit(5000);
    if (error || !data) return [];

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
    .limit(5000);
  if (error || !data) return stats;

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

  return {
    id: row.id,
    slug: slugFor(row),
    title: row.title,
    kind,
    area: row.area ?? row.city ?? "",
    city: row.city ?? "",
    state: (row.state_code ? stateNames.get(row.state_code) : undefined) ?? row.state_code ?? "",
    // Kobo per pricePeriod unit, straight from the column. Rentals are always
    // an annual figure, which is what the RENT market and its cards expect.
    priceMinor: row.price_per_night_minor,
    currency: "NGN",
    // The yearly market is rental, shop, office and land. The column is the
    // authority; the kind test is the belt for a row written before the
    // commercial types existed.
    pricePeriod:
      row.price_period === "year" || YEARLY_KINDS.has(kind) ? "year" : "night",
    source: "rentme",
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    // The host's own capacity, not a figure derived from bedroom count. Every
    // listings row carries one; the check constraint keeps it above zero.
    maxGuests: row.max_guests,
    rating: stat?.rating ?? 0,
    reviewCount: stat?.count ?? 0,
    // First-party inventory is admitted through agent approval, so a published
    // listing is by definition a verified one.
    verified: true,
    instantBook: row.instant_book,
    amenities,
    photos,
    hue: hueFor(row.id),
  };
}

/** Map raw rows into listings, resolving references and review stats in bulk. */
async function mapRows(supabase: Client, rows: ListingRow[]): Promise<Listing[]> {
  if (rows.length === 0) return [];
  const [stateNames, amenityCodes, stats] = await Promise.all([
    getStateNames(supabase),
    getAmenityCodes(supabase),
    getReviewStats(
      supabase,
      rows.map((r) => r.id),
    ),
  ]);
  return rows.map((row) => mapRow(row, stateNames, amenityCodes, stats));
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
   *   In memory  free text (the same haystack the seed catalogue uses, until a
   *            Postgres full text index exists) and verified-only, which needs
   *            no predicate here: RLS publishes first-party rows only and
   *            admission is what makes them verified, so every row this query
   *            can return already satisfies it. The shared matcher still
   *            enforces it, because it is also what holds partner stock and
   *            unverified catalogue rows to the same request.
   *
   * The matcher runs over the results either way, so SQL is an optimisation
   * and never the authority: the two halves cannot disagree.
   */
  async search(filter: ListingSearchFilter = {}): Promise<Listing[]> {
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

      const wantsBudget =
        filter.minPriceMinor !== undefined || filter.maxPriceMinor !== undefined;
      if (wantsBudget) {
        // Kobo in, kobo compared. A row with no amount cannot be shown to fit a
        // budget, which is exactly what the shared matcher decides too.
        query = query.gt("price_per_night_minor", 0);
        if (filter.minPriceMinor !== undefined) {
          query = query.gte("price_per_night_minor", filter.minPriceMinor);
        }
        if (filter.maxPriceMinor !== undefined) {
          query = query.lte("price_per_night_minor", filter.maxPriceMinor);
        }
      }
      if (filter.bedrooms !== undefined) query = query.gte("bedrooms", filter.bedrooms);
      if (filter.bathrooms !== undefined) query = query.gte("bathrooms", filter.bathrooms);
      if (filter.guests !== undefined) {
        // Every listings row declares its own capacity, so the predicate is
        // the column itself. This is exactly what `sleeps` decides in the
        // matcher for a row that carries a declared number, which every row
        // from this table does, so the two halves cannot disagree.
        query = query.gte("max_guests", filter.guests);
      }
      if (filter.instantBook) query = query.eq("instant_book", true);

      const { data, error } = await query
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(CATALOGUE_LIMIT);
      if (error || !data) return [];

      const listings = await mapRows(supabase, data as ListingRow[]);
      return listings.filter((l) => matchesFilter(l, filter));
    } catch {
      return [];
    }
  }

  async recommended(limit = 6): Promise<Listing[]> {
    return diversePick(await this.search({}), limit);
  }

  async byId(id: string): Promise<Listing | null> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_SELECT)
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
