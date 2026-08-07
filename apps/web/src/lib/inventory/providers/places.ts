import "server-only";

import { isSupabaseConfigured } from "../../supabase/env";
import type { Listing, ListingSearchFilter } from "../../listings/types";
import { asArray, asNumber, asRecord, asString, requestJson } from "../http";
import {
  DEFAULT_PARTNER_CITY,
  hueFor,
  nearestCity,
  partnerId,
  resolveCity,
  slugify,
  type PartnerCity,
} from "../mapping";
import {
  providerError,
  providerNoKey,
  providerNotApplicable,
  providerOk,
  type InventoryProvider,
  type ProviderResult,
} from "../types";

/**
 * Partner restaurants AND hotels, from the Google Places API (New) Text Search.
 *
 * Hotels arrived here rather than from Amadeus because Amadeus decommissioned
 * its self-service portal: what is left is an enterprise product behind a
 * signed agreement, which is not a thing a platform can be blocked on before
 * launch. Places already had a key, a cache policy and a mapping layer, and it
 * covers lodging as readily as it covers food, so both categories are served by
 * one credential and one set of rules.
 *
 * Caching here is a licence condition, not an optimisation. Google's terms let
 * us keep a `place_id` indefinitely but only cache place DETAILS briefly, so
 * this file splits the two:
 *
 * - `place_id`s go to `public.places_cache` (migration pending in
 *   `supabase/migrations/20260730013516_places_cache.sql`), and nothing else does. No
 *   names, no addresses, no ratings, no photos: only the id, the search it was
 *   found under and when we last saw it.
 * - Mapped details live in an in-process cache for three minutes, then they are
 *   gone and the next view refetches. Nothing details-shaped is ever written to
 *   Postgres or into the Next data cache.
 *
 * Every listing produced carries `source: "partner"`, `verified: false` and
 * `partner.attribution: "Google"`, which is what makes the UI render "powered
 * by Google" wherever this data shows (docs/HYBRID_INVENTORY.md section 2).
 *
 * Two prices we refuse to invent: Places reports a price LEVEL, not a naira
 * amount, so `priceMinor` stays 0 and the card shows no price rather than a
 * guessed one. And photos need the API key on the media URL, so a partner
 * restaurant ships no photos at all rather than leaking a server key into an
 * image tag; the card's gradient tile covers it.
 *
 * Nothing here throws. Every failure resolves to an empty envelope.
 */

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const DETAILS_URL = "https://places.googleapis.com/v1/places";

/** The provider's own time budget, inside the caller's hard timeout. */
const BUDGET_MS = 2_300;

/** Details may only be held briefly. Three minutes, then refetch. */
const DETAIL_TTL_MS = 180_000;

/** How many venues one search maps. */
const RESULT_LIMIT = 20;

/** Search bias radius around a covered city centre, in metres. */
const BIAS_RADIUS_M = 20_000;

/** The fields we ask for, and the only fields we are billed for. */
const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.addressComponents",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.businessStatus",
  "places.primaryTypeDisplayName",
  // Google's own classification decides whether a venue is a hotel or a
  // restaurant. We ask for a category with `includedType`, but the answer is
  // read off the place rather than assumed from the question, because a text
  // search is a suggestion and these two categories genuinely overlap: a hotel
  // with a well known restaurant is returned by both.
  "places.primaryType",
  "places.types",
].join(",");

/** The same fields for a single place, where the mask carries no prefix. */
const DETAIL_FIELD_MASK = SEARCH_FIELD_MASK.replace(/places\./g, "");

function apiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY ?? "";
  return key.length > 0 ? key : null;
}

/** True when the Places key is present. Cheap, synchronous. */
export function placesConfigured(): boolean {
  return apiKey() !== null;
}

/* ------------------------------------------------------------- details TTL cache */

const detailCache = new Map<string, { value: Listing; expires: number }>();

function readDetailCache(placeId: string): Listing | null {
  const hit = detailCache.get(placeId);
  if (!hit) return null;
  if (hit.expires <= Date.now()) {
    detailCache.delete(placeId);
    return null;
  }
  return hit.value;
}

function writeDetailCache(listing: Listing, placeId: string): void {
  detailCache.set(placeId, { value: listing, expires: Date.now() + DETAIL_TTL_MS });
}

/* -------------------------------------------------------------- place_id cache table */

/**
 * The shape of the one table this provider writes.
 *
 * It is addressed through a deliberately narrow local type rather than the
 * generated `Database` types, because the migration is pending: the lead applies
 * `supabase/migrations/20260730013516_places_cache.sql`, and only then does the table
 * exist to be regenerated into `database.types.ts`. Until it does, the upsert
 * fails, the failure is swallowed, and discovery does not notice.
 */
type PlacesCacheRow = {
  place_id: string;
  found_for: string;
  city: string;
  last_seen_at: string;
};

type MinimalUpsert = {
  from(table: string): {
    upsert(
      values: PlacesCacheRow[],
      options: { onConflict: string },
    ): Promise<{ error: unknown }>;
  };
};

/**
 * Remember the place_ids a search saw. Fire and forget by design.
 *
 * A cache write must never slow a page down or fail a search, and this one is
 * not on the read path at all: every view refetches details, so losing the write
 * costs nothing but a record of which venues we have seen.
 */
async function rememberPlaceIds(placeIds: string[], foundFor: string, city: string): Promise<void> {
  if (placeIds.length === 0) return;
  if (!isSupabaseConfigured()) return;
  if ((process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length === 0) return;
  try {
    const { createAdminClient } = await import("../../supabase/admin");
    const db = createAdminClient() as unknown as MinimalUpsert;
    const seenAt = new Date().toISOString();
    await db.from("places_cache").upsert(
      placeIds.map((place_id) => ({ place_id, found_for: foundFor, city, last_seen_at: seenAt })),
      { onConflict: "place_id" },
    );
  } catch {
    // The table may not exist yet, and that is expected. Nothing to do.
  }
}

/* --------------------------------------------------------------------- categories */

/**
 * What this provider sells, and how it asks for each.
 *
 * `includedType` is `lodging` rather than `hotel` on purpose. Nigerian stock is
 * full of guest houses, resorts and serviced apartments that carry `lodging`
 * and never carry `hotel`, and asking for the narrow type would quietly drop
 * most of a city. The classifier below then reads the answer back, so a venue
 * that is really a restaurant cannot arrive on the hotel shelf.
 */
type PlacesCategory = {
  readonly kind: "restaurant" | "hotel";
  /** The single Places type the search is restricted to. */
  readonly includedType: string;
  /** The words used when the visitor typed nothing to search for. */
  readonly subject: string;
};

const RESTAURANTS: PlacesCategory = {
  kind: "restaurant",
  includedType: "restaurant",
  subject: "restaurants",
};

const HOTELS: PlacesCategory = {
  kind: "hotel",
  includedType: "lodging",
  subject: "hotels",
};

/**
 * Somewhere to sleep, as Google spells it.
 *
 * Deliberately wide. Every one of these is a place a traveller books a night
 * in, and a platform that showed only the ones labelled `hotel` would be
 * missing most of what people here actually stay in.
 */
const LODGING_TYPES = new Set([
  "lodging",
  "hotel",
  "motel",
  "inn",
  "resort_hotel",
  "extended_stay_hotel",
  "bed_and_breakfast",
  "guest_house",
  "hostel",
  "cottage",
  "farmstay",
  "private_guest_room",
]);

const FOOD_TYPES = new Set([
  "restaurant",
  "cafe",
  "coffee_shop",
  "bar",
  "bakery",
  "meal_takeaway",
  "meal_delivery",
  "food",
]);

/**
 * Which shelf a place belongs on, decided by Google's classification.
 *
 * Lodging wins a tie, and that ordering is the whole point. A hotel with a
 * famous restaurant carries both sets of types; putting it under Restaurants
 * would offer a night's stay as a table for two. Somewhere to sleep is the
 * bigger promise, so it is the one that decides.
 *
 * Null means Google gave us nothing to go on, and the caller falls back to the
 * category it asked for rather than guessing.
 */
function kindFromPlace(place: Record<string, unknown>): "restaurant" | "hotel" | null {
  const types = new Set<string>();
  const primary = asString(place["primaryType"]);
  if (primary) types.add(primary);
  for (const entry of asArray(place["types"])) {
    if (typeof entry === "string") types.add(entry);
  }
  if (types.size === 0) return null;

  for (const type of types) if (LODGING_TYPES.has(type)) return "hotel";
  // `*_restaurant` covers the long tail Google keeps adding: nigerian_restaurant,
  // seafood_restaurant, and so on. Matching the suffix means a new one works the
  // day Google ships it rather than the day somebody notices it missing.
  for (const type of types) {
    if (FOOD_TYPES.has(type) || type.endsWith("_restaurant")) return "restaurant";
  }
  return null;
}

/* ---------------------------------------------------------------------- mapping */

/** One named address component off a place, by type. */
function componentNamed(place: Record<string, unknown>, want: string): string | null {
  for (const entry of asArray(place["addressComponents"])) {
    const component = asRecord(entry);
    if (!component) continue;
    const types = asArray(component["types"]).filter((t): t is string => typeof t === "string");
    if (!types.includes(want)) continue;
    const name = asString(component["longText"]) ?? asString(component["shortText"]);
    if (name) return name;
  }
  return null;
}

/**
 * Where a venue actually is, in Google's own words, for the ones our own map
 * cannot place.
 *
 * `nearestCity` answers with one of 38 capitals within 120km, which covers most
 * of the country and not all of it. Everything it could not place used to fall
 * back to the DEFAULT city, so a hotel in a town far from any capital was
 * labelled Lagos. That is not a cosmetic mislabel: the shared filter matches a
 * query against title, area, city and state, so a venue stamped with the wrong
 * city is then DROPPED from the results of the search that found it, and the
 * shelf goes empty for the same reason it did before, one layer further down.
 *
 * Google already told us the locality and the state on every place. Reading
 * them is strictly better than guessing, and returns null only when it said
 * neither.
 */
function placeFromComponents(
  place: Record<string, unknown>,
): { name: string; state: string } | null {
  const locality =
    componentNamed(place, "locality") ??
    componentNamed(place, "administrative_area_level_2") ??
    componentNamed(place, "sublocality_level_1");
  const state = componentNamed(place, "administrative_area_level_1");
  if (!locality && !state) return null;
  return { name: locality ?? state ?? "", state: state ?? locality ?? "" };
}

/** The sub-city locality Google gives, so a card can print a real area. */
function areaFrom(place: Record<string, unknown>, city: { name: string }): string {
  const wanted = ["sublocality_level_1", "sublocality", "neighborhood", "locality"];
  for (const want of wanted) {
    for (const entry of asArray(place["addressComponents"])) {
      const component = asRecord(entry);
      if (!component) continue;
      const types = asArray(component["types"]).filter((t): t is string => typeof t === "string");
      if (!types.includes(want)) continue;
      const name = asString(component["longText"]) ?? asString(component["shortText"]);
      if (name && name.toLowerCase() !== city.name.toLowerCase()) return name;
    }
  }
  return city.name;
}

/**
 * A Place into a Listing.
 *
 * Only permanently or temporarily closed venues are refused; everything else
 * maps, with the venue placed by its own coordinates where Google gives them.
 */
function mapPlace(
  entry: unknown,
  fallbackCity: PartnerCity,
  fallbackKind: "restaurant" | "hotel",
): Listing | null {
  const place = asRecord(entry);
  if (!place) return null;
  const placeId = asString(place["id"]);
  const title = asString(asRecord(place["displayName"])?.["text"]);
  if (!placeId || !title) return null;

  const status = asString(place["businessStatus"]);
  if (status && status !== "OPERATIONAL") return null;

  const location = asRecord(place["location"]);
  const lat = asNumber(location?.["latitude"]);
  const lng = asNumber(location?.["longitude"]);
  /*
   * Three answers, best first: our own map, then Google's words, then the
   * default. The middle one is new and it is the one that stops a venue outside
   * the 120km reach of any covered capital being stamped "Lagos" and then
   * filtered out of the very search that found it.
   */
  const city: { name: string; state: string } =
    (lat !== null && lng !== null ? nearestCity(lat, lng) : null) ??
    placeFromComponents(place) ??
    fallbackCity;

  const id = partnerId("places", placeId);
  const mapsUri = asString(place["googleMapsUri"]);
  const websiteUri = asString(place["websiteUri"]);
  // The universal Maps URL needs no key and works on every platform.
  const directionsUrl =
    lat !== null && lng !== null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(placeId)}`
      : mapsUri;
  // The venue's own page where it has one, and its Maps page otherwise. Never a
  // booking link, for either category: we do not take reservations on somebody
  // else's stock, and a hotel booked through us that we cannot confirm would be
  // the worst promise on the platform.
  const venueUrl = websiteUri ?? mapsUri;

  return {
    id,
    slug: [slugify(title), slugify(city.name)].filter((p) => p.length > 0).join("-") || id,
    title,
    kind: kindFromPlace(place) ?? fallbackKind,
    area: areaFrom(place, city),
    city: city.name,
    state: city.state,
    /* Google's own geocode, carried rather than discarded. It was already read
       above to choose the city and to build the directions link; the third
       reader is de-duplication, which is the one that needs it most, because a
       hotel we have admitted ourselves and the same hotel arriving from Google
       are 20 metres apart and spelled differently. */
    ...(lat !== null && lng !== null ? { lat, lng } : {}),
    // Places reports a price level, never an amount. We do not convert a level
    // into naira, so there is no price to show and the card shows none.
    priceMinor: 0,
    currency: "NGN",
    source: "partner",
    partner: {
      provider: "places",
      attribution: "Google",
      ...(directionsUrl ? { directionsUrl } : {}),
      ...(venueUrl ? { venueUrl } : {}),
    },
    bedrooms: 0,
    bathrooms: 0,
    rating: asNumber(place["rating"]) ?? 0,
    reviewCount: asNumber(place["userRatingCount"]) ?? 0,
    verified: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: hueFor(id),
  };
}

/* -------------------------------------------------------------------- the provider */

/** The query Google is asked, from a filter that only carries free text. */
export function textQuery(
  filter: ListingSearchFilter,
  city: PartnerCity,
  category: PlacesCategory,
): string {
  const q = filter.q?.trim();

  /*
   * WHATEVER SOMEBODY TYPED IS THE PLACE. Nigeria has tens of thousands of
   * them and this file knows 38.
   *
   * The first version of this used the visitor's words as the SUBJECT and the
   * resolved city as the location, so "Lagos" went out as "Lagos in Lagos,
   * Nigeria" with `includedType: lodging`. The one thing in Lagos actually
   * named "Lagos" is the locality, a locality is not lodging, and Google
   * answered 200 with an empty list. Valid key, enabled API, successful call,
   * `outcome: "ok"`, empty shelf.
   *
   * The fix for that only recognised a place if it appeared in `PARTNER_CITIES`
   * (38 entries: the state capitals and a handful of aliases). So it fixed
   * "Lagos" and left every real Nigerian locality broken in the original way.
   * Awoyaya is in Ibeju-Lekki and Dutse is in Bwari, neither is on that list,
   * and both went out as a SUBJECT against a Lagos bias: "Awoyaya in Lagos,
   * Nigeria", "Dutse in Lagos, Nigeria". The second one is not even the right
   * state.
   *
   * A hardcoded gazetteer of Nigeria is the wrong shape of answer, and we do
   * not need one: Google already has it. `searchText` resolves a place from the
   * text far better than a 38 row table ever will, so the text now says what we
   * want and where, and the resolution is left to the service that has the map.
   *
   * "eko hotel" reads as "hotels in eko hotel, Nigeria", which looks odd and
   * works: a text search matches strongly on a venue's own name, so the venue
   * still comes back. That is the deliberate trade. The partner shelf is a
   * discovery surface rather than a venue lookup, searching a place is the
   * overwhelmingly common case, and one form that serves both beats two forms
   * where the common one is broken.
   */
  if (q && q.length > 1) return `${category.subject} in ${q}, Nigeria`;

  // Nothing typed. The default market, named explicitly.
  return `${category.subject} in ${city.name}, Nigeria`;
}

/**
 * One provider per category, sharing every rule.
 *
 * Two registrations rather than one that returns both, because the two shelves
 * are governed by different kill switches: `hybrid_restaurants` and
 * `hybrid_hotels` have to be able to move independently, and the registry gates
 * one flag per entry. Both still answer to the name "places", so the partner id
 * scheme and every card that already carries one are untouched.
 */
function makePlacesProvider(category: PlacesCategory): InventoryProvider {
  return {
  name: "places",

  async search(filter: ListingSearchFilter): Promise<ProviderResult> {
    const key = apiKey();
    if (!key) return providerNoKey("places");
    // A search for one category is not a question this shelf can answer.
    if (filter.kind && filter.kind !== category.kind) return providerNotApplicable("places");

    const deadline = Date.now() + BUDGET_MS;
    try {
      /*
       * Two different jobs, deliberately not the same value any more.
       *
       * `city` is the FALLBACK used to label a venue Google gave no usable
       * coordinates for. It always has a value, because a listing needs a city.
       *
       * `bias` is the hint sent upstream, and it is null whenever the query
       * names somewhere this file does not recognise. That is most of Nigeria,
       * and pretending otherwise is what centred a search for Dutse on Lagos.
       */
      const known = filter.q ? resolveCity(filter.q) : null;
      const city = known ?? DEFAULT_PARTNER_CITY;
      const bias = known ?? (filter.q ? null : DEFAULT_PARTNER_CITY);
      const query = textQuery(filter, city, category);
      const outcome = await requestJson(
        SEARCH_URL,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": SEARCH_FIELD_MASK,
          },
          body: JSON.stringify({
            textQuery: query,
            includedType: category.includedType,
            maxResultCount: RESULT_LIMIT,
            languageCode: "en",
            /* Nigeria, always. This is what keeps an unbiased search national
               rather than global, and it is why dropping the circle below is
               safe. */
            regionCode: "NG",
            /*
             * A 20km circle, but ONLY when we actually know where.
             *
             * This used to be sent unconditionally, centred on whatever
             * `cityForFilter` returned, which is Lagos for every query it does
             * not recognise. So a search for Dutse, which is in Abuja, was
             * pulled towards Lagos, and one for Awoyaya was centred 45km away
             * from the place being asked for. The bias was actively fighting
             * the question on every search outside the 38 known names.
             *
             * Omitted, Google resolves the place from the text and `regionCode`
             * keeps it in the country. A bias is a hint about where to look,
             * and a hint we are not entitled to give is worse than none.
             */
            ...(bias
              ? {
                  locationBias: {
                    circle: {
                      center: { latitude: bias.lat, longitude: bias.lng },
                      radius: BIAS_RADIUS_M,
                    },
                  },
                }
              : {}),
          }),
        },
        deadline,
      );
      if (!outcome.ok) return providerError("places", outcome.reason);

      const places = asArray(asRecord(outcome.data)?.["places"]);
      const listings: Listing[] = [];
      const placeIds: string[] = [];
      for (const entry of places) {
        const listing = mapPlace(entry, city, category.kind);
        if (!listing) continue;
        // Google classifies, we do not argue, but a venue that came back on the
        // wrong shelf is dropped rather than relabelled: a restaurant listed
        // among hotels is a worse result than one fewer hotel.
        if (listing.kind !== category.kind) continue;
        listings.push(listing);
        const placeId = asString(asRecord(entry)?.["id"]);
        if (placeId) {
          placeIds.push(placeId);
          writeDetailCache(listing, placeId);
        }
      }

      // Ids are keepable forever, details are not. This is the only write.
      void rememberPlaceIds(placeIds, query, city.name);

      return providerOk("places", listings);
    } catch (error) {
      return providerError("places", error instanceof Error ? error.name : "unknown fault");
    }
  },
  };
}

export const placesRestaurantProvider: InventoryProvider = makePlacesProvider(RESTAURANTS);
export const placesHotelProvider: InventoryProvider = makePlacesProvider(HOTELS);

/**
 * One partner venue, refetched, for the detail page.
 *
 * Serves the brief in-process cache when the venue was seen in the last few
 * minutes, and otherwise asks Google again. Details are never read back from
 * Postgres, which is the whole point of splitting the two caches.
 *
 * The category is not a parameter, because a partner id carries a Google
 * place_id and nothing else. It is read off the response, which is why the
 * classifier had to be built from Google's types rather than from the search
 * we happened to run: this path has no search to remember.
 */
export async function placesById(placeId: string): Promise<Listing | null> {
  const key = apiKey();
  if (!key) return null;
  const cached = readDetailCache(placeId);
  if (cached) return cached;

  const deadline = Date.now() + BUDGET_MS;
  try {
    const outcome = await requestJson(
      `${DETAILS_URL}/${encodeURIComponent(placeId)}?languageCode=en&regionCode=NG`,
      {
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": DETAIL_FIELD_MASK,
        },
      },
      deadline,
    );
    if (!outcome.ok) return null;
    /* A venue reached by id was classified once already, when its card was
       built. Restaurant is the fallback only for the case where Google returns
       no types at all, which is the same fallback the old single-category
       version had, so nothing that worked before behaves differently. */
    const listing = mapPlace(outcome.data, DEFAULT_PARTNER_CITY, "restaurant");
    if (listing) writeDetailCache(listing, placeId);
    return listing;
  } catch {
    return null;
  }
}
