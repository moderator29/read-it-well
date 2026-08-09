import "server-only";

import type { Database } from "../supabase/database.types";
import { createClient } from "../supabase/server";
import { propertyTypeFor } from "./supabase-repository";
import type { ListingKind } from "./types";

/**
 * What is on the map, right now, in the box the reader is looking at.
 *
 * `public.listings_in_bounds` has existed in the database for some time and
 * nothing in the application called it (RECOMMENDATIONS M-4, BE-8). It is a
 * good function: `LANGUAGE sql STABLE`, `search_path` pinned to empty, NOT
 * security definer so RLS still decides what a caller may see, filtered on
 * `status = 'PUBLISHED' and location is not null`, and matched with the `&&`
 * operator against `st_makeenvelope(..., 4326)` so it lands on the
 * `listings_location_gist` partial index rather than scanning. It returns
 * twelve narrow columns rather than a listing, which is exactly what a pin
 * needs and a twentieth of what a card needs.
 *
 * ## This module exists for the two things the SQL cannot do for itself
 *
 * The function clamps its own row count with
 * `least(greatest(coalesce(p_limit, 500), 1), 1000)`. It does not and cannot
 * clamp the BOX, and the box is the actual exposure: it is granted to `anon`,
 * so an unauthenticated caller passing a rectangle covering Nigeria gets up to
 * a thousand published listings with their coordinates in one request. That is
 * a catalogue export with pin locations, and SEC-6 point 3 named it before this
 * was ever wired up.
 *
 * So, before any box reaches Postgres:
 *
 *   - it is REJECTED if any corner is not a finite number, rather than passed
 *     through to `st_makeenvelope` as a NaN;
 *   - corners are normalised, so an inverted rectangle is repaired rather than
 *     silently matching nothing;
 *   - it is clamped to Nigeria's extent, because a box outside the country
 *     cannot contain a Nigerian listing and a huge box that merely overlaps the
 *     country should be answered for the part that does;
 *   - it is REFUSED if either span exceeds `MAX_SPAN_DEGREES`, because a
 *     viewport query is a viewport query. Nobody is looking at four degrees of
 *     latitude and reading pins.
 *
 * Rate limiting belongs to the caller rather than to this module, because the
 * subject differs by surface: the route handler counts by IP, a server render
 * would count by user. `app/api/map/listings/route.ts` does it.
 *
 * Nothing here throws. An unreachable database is a map with no pins on it, the
 * same contract every other read in `lib/listings` keeps.
 */

type Intent = Database["public"]["Enums"]["listing_intent"];
type PropertyType = Database["public"]["Enums"]["property_type"];

/** A rectangle in decimal degrees, WGS84. */
export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/**
 * Nigeria's bounding box, generously drawn.
 *
 * Roughly 2.6E to 14.7E and 4.2N to 13.9N, padded. Clamping to this is not a
 * claim that listings cannot exist elsewhere; it is the statement that this
 * platform's catalogue is Nigerian, so a box outside it has nothing to return
 * and a box far larger than it is not a viewport.
 */
const NIGERIA: Bounds = { west: 2.0, south: 3.8, east: 15.2, north: 14.4 };

/**
 * The widest viewport this endpoint will answer, in degrees.
 *
 * 1.5 degrees is about 165km, which at a phone's aspect ratio is a metropolitan
 * area and then some: greater Lagos fits inside 0.6. A caller asking for more
 * is zoomed out past the point where individual pins mean anything, and that is
 * the zoom level at which a map should be showing clusters or nothing at all
 * (M-7), not shipping the catalogue.
 */
export const MAX_SPAN_DEGREES = 1.5;

/** The most pins one viewport read returns, whatever the caller asks for. */
export const MAX_PINS = 300;

/** One pin. Deliberately not a `Listing`: a pin is not a card. */
export type MapPin = {
  id: string;
  title: string;
  kind: ListingKind;
  intent: "rent" | "sale";
  area: string;
  city: string;
  lat: number;
  lng: number;
  bedrooms: number;
  bathrooms: number;
  /** The one figure this row leads with, in kobo. Zero when unpriced. */
  priceMinor: number;
};

export type BoundsFilter = {
  intent?: "rent" | "sale";
  kind?: ListingKind;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  bedrooms?: number;
  limit?: number;
};

export type BoundsRefusal =
  /** A corner was missing, non-numeric or infinite. */
  | "malformed"
  /** The box is wider or taller than a viewport. */
  | "too-wide"
  /** The box does not overlap Nigeria at all. */
  | "out-of-range";

export type BoundsResult =
  | { ok: true; pins: MapPin[] }
  | { ok: false; reason: BoundsRefusal };

/* ------------------------------------------------------------ the box rules */

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Read a box from four unknown values, or say why not.
 *
 * Separate from the query on purpose: this is the whole security surface of a
 * public endpoint and it is a pure function, so it is testable without a
 * database and without a request.
 */
export function readBounds(raw: {
  west: unknown;
  south: unknown;
  east: unknown;
  north: unknown;
}): { ok: true; bounds: Bounds } | { ok: false; reason: BoundsRefusal } {
  if (!finite(raw.west) || !finite(raw.south) || !finite(raw.east) || !finite(raw.north)) {
    return { ok: false, reason: "malformed" };
  }

  // Longitude beyond +/-180 or latitude beyond +/-90 is not a rectangle on
  // earth, whatever the caller meant by it.
  if (Math.abs(raw.west) > 180 || Math.abs(raw.east) > 180) {
    return { ok: false, reason: "malformed" };
  }
  if (Math.abs(raw.south) > 90 || Math.abs(raw.north) > 90) {
    return { ok: false, reason: "malformed" };
  }

  // An inverted rectangle is a dragged selection, not an attack. Repair it.
  const west = Math.min(raw.west, raw.east);
  const east = Math.max(raw.west, raw.east);
  const south = Math.min(raw.south, raw.north);
  const north = Math.max(raw.south, raw.north);

  // Refuse on the span the CALLER asked for, before clamping. Clamping first
  // would turn "give me the whole country" into a legal request for the whole
  // country, which is precisely the request being refused.
  if (east - west > MAX_SPAN_DEGREES || north - south > MAX_SPAN_DEGREES) {
    return { ok: false, reason: "too-wide" };
  }

  if (east < NIGERIA.west || west > NIGERIA.east) return { ok: false, reason: "out-of-range" };
  if (north < NIGERIA.south || south > NIGERIA.north) {
    return { ok: false, reason: "out-of-range" };
  }

  return {
    ok: true,
    bounds: {
      west: Math.max(west, NIGERIA.west),
      south: Math.max(south, NIGERIA.south),
      east: Math.min(east, NIGERIA.east),
      north: Math.min(north, NIGERIA.north),
    },
  };
}

/** The row ceiling, clamped the same way the SQL clamps its own. */
export function pinCap(requested: number | undefined): number {
  if (requested === undefined || !Number.isFinite(requested)) return MAX_PINS;
  const whole = Math.floor(requested);
  if (whole < 1) return MAX_PINS;
  return Math.min(whole, MAX_PINS);
}

/* ------------------------------------------------------------- the read */

/**
 * Kinds that live in the listings table, mapped to the enum the RPC takes.
 *
 * Reuses `propertyTypeFor` so the map and the catalogue cannot disagree about
 * what a kind is. A kind with no property type has no rows and is answered as
 * an empty box rather than as an unfiltered one, because dropping an
 * unrecognised filter would show a reader pins they explicitly excluded.
 */
function propertyTypeOrNull(kind: ListingKind | undefined): PropertyType | null | "refuse" {
  if (kind === undefined) return null;
  const mapped = propertyTypeFor(kind);
  return mapped === null ? "refuse" : (mapped as PropertyType);
}

export async function listingsInBounds(
  raw: { west: unknown; south: unknown; east: unknown; north: unknown },
  filter: BoundsFilter = {},
): Promise<BoundsResult> {
  const box = readBounds(raw);
  if (!box.ok) return { ok: false, reason: box.reason };

  const propertyType = propertyTypeOrNull(filter.kind);
  if (propertyType === "refuse") return { ok: true, pins: [] };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("listings_in_bounds", {
      p_west: box.bounds.west,
      p_south: box.bounds.south,
      p_east: box.bounds.east,
      p_north: box.bounds.north,
      p_limit: pinCap(filter.limit),
      ...(filter.intent ? { p_intent: filter.intent as Intent } : {}),
      ...(propertyType ? { p_property_type: propertyType } : {}),
      ...(filter.bedrooms === undefined ? {} : { p_bedrooms: filter.bedrooms }),
      ...(filter.minPriceMinor === undefined
        ? {}
        : { p_min_price_minor: filter.minPriceMinor }),
      ...(filter.maxPriceMinor === undefined
        ? {}
        : { p_max_price_minor: filter.maxPriceMinor }),
    });

    if (error || !data) return { ok: true, pins: [] };

    const pins: MapPin[] = [];
    for (const row of data) {
      // A row without both coordinates cannot be placed. The function already
      // requires `location is not null`, so this is belt and braces against a
      // row whose geometry and columns have drifted apart, and it is cheap.
      if (!finite(row.latitude) || !finite(row.longitude)) continue;
      pins.push({
        id: row.id,
        title: row.title,
        kind: (row.property_type as ListingKind) ?? "home",
        intent: row.listing_intent === "sale" ? "sale" : "rent",
        area: row.area ?? row.city ?? "",
        city: row.city ?? "",
        lat: row.latitude,
        lng: row.longitude,
        bedrooms: row.bedrooms ?? 0,
        bathrooms: row.bathrooms ?? 0,
        // `price_minor` is null for a row that states no price at all. A pin
        // showing nothing is honest; a pin showing zero reads as free.
        priceMinor: finite(row.price_minor) ? row.price_minor : 0,
      });
    }
    return { ok: true, pins };
  } catch {
    return { ok: true, pins: [] };
  }
}
