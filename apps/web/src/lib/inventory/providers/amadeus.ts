import "server-only";

import type { Listing, ListingSearchFilter } from "../../listings/types";
import { asArray, asNumber, asRecord, asString, remaining, requestJson } from "../http";
import {
  cityForFilter,
  decimalToMinor,
  hueFor,
  nearestCity,
  partnerId,
  slugify,
  type PartnerCity,
} from "../mapping";
import {
  providerError,
  providerNoKey,
  providerNotApplicable,
  providerOk,
  providerTimeout,
  type InventoryProvider,
  type ProviderResult,
} from "../types";

/**
 * Partner hotels, from the Amadeus Self-Service APIs.
 *
 * Three hops, one budget: an OAuth2 client-credentials token (cached in process
 * and refreshed a minute before it expires), a Hotel List call to learn which
 * hotel ids exist near a covered city (reference data, cached for hours because
 * it barely changes), then a Hotel Search call for live offers on those ids
 * (never cached, because a stale rate is a lie).
 *
 * Two rules this file will not bend:
 *
 * - `verified` is FALSE on every listing it produces, and `source` is
 *   "partner". Third-party stock cannot carry our trust badge, ever
 *   (docs/HYBRID_INVENTORY.md sections 2 and 4).
 * - A price is only mapped when the upstream currency is NGN. Amadeus quotes in
 *   whatever currency the property sells in, and we do not hold an FX rate, so
 *   a non-naira offer is DROPPED and noted. A missing hotel is a gap; a hotel
 *   priced with an invented exchange rate is a lie to a paying guest.
 *
 * Nothing here throws. Every failure resolves to an empty envelope.
 */

/** The provider's own time budget, inside the caller's hard timeout. */
const BUDGET_MS = 2_300;

/** Refresh the token this long before it actually expires. */
const TOKEN_SKEW_MS = 60_000;

/** Hotel ids near a city are reference data, not rates. */
const HOTEL_LIST_TTL_MS = 6 * 60 * 60 * 1_000;

/** How many hotel ids one offers call asks about. */
const HOTEL_ID_LIMIT = 20;

/** How far from the city centre the hotel list looks. */
const RADIUS_KM = 20;

type Credentials = { id: string; secret: string };

function credentials(): Credentials | null {
  const id = process.env.AMADEUS_CLIENT_ID ?? "";
  const secret = process.env.AMADEUS_CLIENT_SECRET ?? "";
  if (id.length === 0 || secret.length === 0) return null;
  return { id, secret };
}

/** True when both Amadeus credentials are present. Cheap, synchronous. */
export function amadeusConfigured(): boolean {
  return credentials() !== null;
}

/**
 * Test until the app is certified, production after. Anything other than the
 * literal "production" stays on test, so a typo cannot start charging real
 * bookings against a live account.
 */
function baseUrl(): string {
  return process.env.AMADEUS_ENV === "production"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";
}

/* ------------------------------------------------------------------ token cache */

type CachedToken = { value: string; expiresAt: number };

let cachedToken: CachedToken | null = null;
/** One in-flight token request shared by concurrent renders, never a stampede. */
let tokenInFlight: Promise<string | null> | null = null;

/**
 * A valid bearer token, from cache when possible.
 *
 * `expires_in` is seconds (1799 in practice). We treat the token as expired a
 * minute early so a request cannot be signed with a credential that dies
 * mid-flight. A failed token fetch resolves to null, never throws, and is not
 * cached, so the next search tries again.
 */
async function accessToken(creds: Credentials, deadline: number): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - TOKEN_SKEW_MS > now) return cachedToken.value;
  if (tokenInFlight) return tokenInFlight;

  const request = (async (): Promise<string | null> => {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: creds.id,
      client_secret: creds.secret,
    });
    const outcome = await requestJson(
      `${baseUrl()}/v1/security/oauth2/token`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
      deadline,
    );
    if (!outcome.ok) return null;
    const payload = asRecord(outcome.data);
    const token = asString(payload?.["access_token"]);
    const expiresIn = asNumber(payload?.["expires_in"]) ?? 1_799;
    if (!token) return null;
    cachedToken = { value: token, expiresAt: Date.now() + expiresIn * 1_000 };
    return token;
  })();

  tokenInFlight = request;
  try {
    return await request;
  } finally {
    tokenInFlight = null;
  }
}

/* -------------------------------------------------------------- hotel id lookup */

type HotelRef = { hotelId: string; name: string };

const hotelListCache = new Map<string, { value: HotelRef[]; expires: number }>();

/**
 * Hotel ids near a covered city, from the Hotel List reference data API.
 *
 * Hotel Search v3 prices by hotel id and no longer searches by city, so this
 * hop is mandatory. The answer is a catalogue of properties rather than a set
 * of rates, which is why it is safe to keep for hours.
 */
async function hotelIdsNear(
  city: PartnerCity,
  token: string,
  deadline: number,
): Promise<HotelRef[] | { error: string }> {
  const key = `${city.name}:${baseUrl()}`;
  const hit = hotelListCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const query = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lng),
    radius: String(RADIUS_KM),
    radiusUnit: "KM",
    hotelSource: "ALL",
  });
  const outcome = await requestJson(
    `${baseUrl()}/v1/reference-data/locations/hotels/by-geocode?${query.toString()}`,
    { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.amadeus+json" } },
    deadline,
  );
  if (!outcome.ok) return { error: outcome.reason };

  const payload = asRecord(outcome.data);
  const refs: HotelRef[] = [];
  for (const entry of asArray(payload?.["data"])) {
    const row = asRecord(entry);
    if (!row) continue;
    const hotelId = asString(row["hotelId"]);
    const name = asString(row["name"]);
    if (!hotelId || !name) continue;
    refs.push({ hotelId, name });
    if (refs.length >= HOTEL_ID_LIMIT) break;
  }
  hotelListCache.set(key, { value: refs, expires: Date.now() + HOTEL_LIST_TTL_MS });
  return refs;
}

/* ------------------------------------------------------------------- date window */

const MS_PER_DAY = 86_400_000;

function isoDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * The dates a discovery search prices against.
 *
 * The listing filter carries no dates yet, and Hotel Search requires them, so
 * partner cards quote tomorrow for one night at single occupancy. That is the
 * same "from" price a shelf browse shows on any travel site, and the detail
 * page reprices before anything is booked.
 */
function stayWindow(): { checkIn: string; checkOut: string } {
  return { checkIn: isoDay(1), checkOut: isoDay(2) };
}

/* ---------------------------------------------------------------------- mapping */

type MappedOffers = { listings: Listing[]; notes: string[] };

/**
 * Offers into listings, dropping anything not priced in naira.
 *
 * `data[].hotel` carries hotelId, name, cityCode and the geocode; `offers[]`
 * carries the room, the guest count and `price` with `currency`, `base` and
 * `total` as decimal strings. We take the cheapest available offer per hotel,
 * which is what a card's "from" price means.
 */
function mapOffers(payload: unknown, fallbackCity: PartnerCity): MappedOffers {
  const listings: Listing[] = [];
  const notes: string[] = [];
  let droppedForCurrency = 0;

  for (const entry of asArray(asRecord(payload)?.["data"])) {
    const row = asRecord(entry);
    if (!row) continue;
    if (row["available"] === false) continue;

    const hotel = asRecord(row["hotel"]);
    const hotelId = asString(hotel?.["hotelId"]);
    const name = asString(hotel?.["name"]);
    if (!hotelId || !name) continue;

    let best: { minor: number; offerRef: string } | null = null;
    let sawNonNaira = false;
    for (const offerEntry of asArray(row["offers"])) {
      const offer = asRecord(offerEntry);
      const price = asRecord(offer?.["price"]);
      if (!offer || !price) continue;
      const currency = asString(price["currency"]);
      const total = asString(price["total"]) ?? asString(price["base"]);
      if (!currency || !total) continue;
      if (currency !== "NGN") {
        // No invented FX rate, ever. The hotel simply does not appear.
        sawNonNaira = true;
        continue;
      }
      const minor = decimalToMinor(total);
      if (minor === null || minor <= 0) continue;
      const offerRef = asString(offer["id"]) ?? "";
      if (!best || minor < best.minor) best = { minor, offerRef };
    }

    if (!best) {
      if (sawNonNaira) droppedForCurrency += 1;
      continue;
    }

    // Amadeus titles arrive shouted ("JW MARRIOTT GROSVENOR HOUSE").
    const title = titleCase(name);
    const id = partnerId("amadeus", hotelId);
    // Place the hotel by its own geocode where the feed gives one, so a detail
    // lookup labels a Port Harcourt property Port Harcourt whatever city the
    // search that found it covered.
    const lat = asNumber(hotel?.["latitude"]);
    const lng = asNumber(hotel?.["longitude"]);
    const city = (lat !== null && lng !== null ? nearestCity(lat, lng) : null) ?? fallbackCity;
    listings.push({
      id,
      slug: [slugify(title), slugify(city.name)].filter((p) => p.length > 0).join("-") || id,
      title,
      kind: "hotel",
      // The feed gives no locality below the city, so the card and the detail
      // page collapse a repeated area into one line rather than print it twice.
      area: city.name,
      city: city.name,
      state: city.state,
      priceMinor: best.minor,
      currency: "NGN",
      pricePeriod: "night",
      source: "partner",
      partner: {
        provider: "amadeus",
        ...(best.offerRef.length > 0 ? { offerRef: best.offerRef } : {}),
      },
      bedrooms: 1,
      bathrooms: 1,
      // No ratings in the offers payload, and we do not carry reviews for stock
      // we do not own, so the card shows no earned reputation rather than a
      // borrowed one.
      rating: 0,
      reviewCount: 0,
      verified: false,
      instantBook: false,
      amenities: [],
      photos: [],
      hue: hueFor(id),
    });
  }

  if (droppedForCurrency > 0) {
    notes.push(
      `${droppedForCurrency} hotel(s) held back: priced in a currency other than NGN and no exchange rate is held`,
    );
  }
  return { listings, notes };
}

/** "JW MARRIOTT GROSVENOR HOUSE" reads as a name again. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word.length > 0 ? `${word[0]!.toUpperCase()}${word.slice(1)}` : word))
    .join(" ")
    .trim();
}

/* --------------------------------------------------------------------- offers call */

async function fetchOffers(
  hotelIds: string[],
  token: string,
  deadline: number,
): Promise<{ ok: true; payload: unknown } | { ok: false; reason: string }> {
  const { checkIn, checkOut } = stayWindow();
  const query = new URLSearchParams({
    hotelIds: hotelIds.join(","),
    adults: "1",
    checkInDate: checkIn,
    checkOutDate: checkOut,
    roomQuantity: "1",
    bestRateOnly: "true",
    // Asking for naira is a request, not a guarantee: the response currency is
    // the authority and anything else is dropped in mapping.
    currency: "NGN",
  });
  const outcome = await requestJson(
    `${baseUrl()}/v3/shopping/hotel-offers?${query.toString()}`,
    { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.amadeus+json" } },
    deadline,
  );
  return outcome.ok ? { ok: true, payload: outcome.data } : { ok: false, reason: outcome.reason };
}

/* -------------------------------------------------------------------- the provider */

export const amadeusProvider: InventoryProvider = {
  name: "amadeus",

  async search(filter: ListingSearchFilter): Promise<ProviderResult> {
    const creds = credentials();
    if (!creds) return providerNoKey("amadeus");
    // Everything this provider sells is a hotel, so any other category means
    // there is nothing to ask for. No token, no call, no latency.
    if (filter.kind && filter.kind !== "hotel") return providerNotApplicable("amadeus");

    const deadline = Date.now() + BUDGET_MS;
    try {
      const city = cityForFilter(filter);
      const token = await accessToken(creds, deadline);
      if (!token) {
        return remaining(deadline) === 0
          ? providerTimeout("amadeus")
          : providerError("amadeus", "token request failed");
      }

      const refs = await hotelIdsNear(city, token, deadline);
      if ("error" in refs) return providerError("amadeus", refs.error);
      if (refs.length === 0) {
        return providerOk("amadeus", [], [`no partner hotels listed near ${city.name}`]);
      }

      const offers = await fetchOffers(
        refs.map((r) => r.hotelId),
        token,
        deadline,
      );
      if (!offers.ok) return providerError("amadeus", offers.reason);

      const { listings, notes } = mapOffers(offers.payload, city);
      return providerOk("amadeus", listings, notes);
    } catch (error) {
      // Defence in depth: requestJson already swallows transport failures, so
      // reaching here means a programming fault, and it still must not break
      // search.
      return providerError("amadeus", error instanceof Error ? error.name : "unknown fault");
    }
  },
};

/**
 * One partner hotel, repriced, for the detail page.
 *
 * The card carries an id, not a snapshot, so the detail page asks the provider
 * again rather than trusting a rate that was quoted on a previous render.
 */
export async function amadeusHotelById(hotelId: string): Promise<Listing | null> {
  const creds = credentials();
  if (!creds) return null;
  const deadline = Date.now() + BUDGET_MS;
  try {
    const token = await accessToken(creds, deadline);
    if (!token) return null;
    const offers = await fetchOffers([hotelId], token, deadline);
    if (!offers.ok) return null;
    // Labels come from the hotel's own geocode; the default market is only the
    // fallback for a property the feed does not place.
    const { listings } = mapOffers(offers.payload, cityForFilter({}));
    return listings[0] ?? null;
  } catch {
    return null;
  }
}
