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
 * Partner hotels, from LiteAPI (Nuitée).
 *
 * This provider exists because the one it stands next to stopped existing.
 * Amadeus decommissioned its Self-Service portal on 17 July 2026 and disabled
 * the keys with it; what remains is an Enterprise product behind a signed
 * agreement, a different portal and a different API surface. So the hotel shelf
 * had exactly one live feed left, Google Places, and Places answers with a
 * price LEVEL rather than an amount. Every partner hotel card on the platform
 * therefore showed no price at all.
 *
 * LiteAPI was chosen on one hard requirement: a key has to be obtainable
 * without a sales call. Registration on the dashboard issues a sandbox key
 * (`sand_...`) immediately and a production key (`prod_...`) after the account
 * is completed, which is the same shape of access the owner asked for and the
 * only shape this codebase can be built against today.
 *
 * Two hops, one budget:
 *
 * 1. `GET /data/hotels` for the static content near a covered city: names,
 *    coordinates, addresses, photos. Reference data that barely moves, so it is
 *    cached in process for hours.
 * 2. `POST /hotels/rates` for live nightly rates on those hotel ids. NEVER
 *    cached, because a stale rate is a lie told to somebody holding a card.
 *
 * The rules this file does not bend, both inherited rather than invented:
 *
 * - `source` is "partner" and `verified` is FALSE on every listing. Third-party
 *   stock cannot carry our trust badge (docs/HYBRID_INVENTORY.md sections 2, 4).
 * - A price is mapped only when the upstream says NGN. Rates are REQUESTED in
 *   naira and the answer's own currency field is still checked, because a feed
 *   that quietly answers in dollars would put a $412 hotel on the shelf as
 *   ₦412. We hold no FX rate, so a non-naira offer is dropped and noted.
 *
 * What this provider deliberately does NOT do is take a booking. LiteAPI has a
 * real prebook/book pair and that is most of why it was chosen, but the
 * platform has no checkout path for stock it does not own: `reserve()` writes a
 * booking row against a first-party listing, and money is settled against that
 * row. Selling a night we cannot confirm is the worst promise this platform
 * could make, so partner hotels carry a price and no Reserve button until that
 * path is built. The reason and the shape of the missing half are written down
 * in docs/HYBRID_INVENTORY.md section 7 rather than left as a TODO here.
 *
 * Nothing here throws. Every failure resolves to an empty envelope.
 */

const BASE_URL = "https://api.liteapi.travel/v3.0";

/** The provider's own time budget, inside the caller's hard timeout. */
const BUDGET_MS = 2_300;

/** Static hotel content is reference data, not rates. */
const CONTENT_TTL_MS = 6 * 60 * 60 * 1_000;

/** How many hotels one city's content call asks for, and one rates call prices. */
const HOTEL_LIMIT = 20;

/** How far from a covered city centre the content search looks, in metres. */
const RADIUS_M = 20_000;

/** Photos per card. The gallery refetches on the detail page. */
const PHOTO_LIMIT = 6;

const MS_PER_DAY = 86_400_000;

function apiKey(): string | null {
  const key = process.env.LITEAPI_KEY ?? "";
  return key.length > 0 ? key : null;
}

/** True when the LiteAPI key is present. Cheap, synchronous. */
export function liteapiConfigured(): boolean {
  return apiKey() !== null;
}

/**
 * Whether the key even has the shape of one that can call this API, said as a
 * note rather than enforced as a rule.
 *
 * LiteAPI's dashboard hands out two credentials per environment and only one of
 * them works here. The PRIVATE key (`sand_...` in sandbox, `prod_...` in
 * production) is the one every server call authenticates with. The PUBLIC key
 * is for their front-end SDK and the whitelabel booking site, and presenting it
 * to `/data/hotels` gets a flat 401 that says nothing about which of the two
 * you used. That is an easy mistake to make once and impossible to diagnose
 * afterwards, because both are "the key they gave me" and the failure is
 * identical to a revoked key, a typo, or a sandbox key sent to production.
 *
 * So this is advisory and ONLY advisory. It never blocks a call and never
 * decides `configured()`: this is somebody else's credential format, they may
 * change it tomorrow, and a hard check on a guess about a third party's key
 * shape would turn a working key into a dead feed on the day they add a prefix.
 * The call is made either way and the upstream stays the authority. All this
 * does is put the sentence next to the 401 in the admin diagnostic, where the
 * person holding both keys is looking.
 *
 * Never returns any part of the key.
 */
export function liteapiKeyShapeNote(): string | null {
  const key = apiKey();
  if (key === null) return null;
  if (key.startsWith("sand_") || key.startsWith("prod_")) return null;
  return (
    "The key does not begin with sand_ or prod_, which is the shape of a LiteAPI " +
    "PRIVATE key. Server calls need the private key; the public key is for their " +
    "front-end SDK and is refused here with the same 401 as a bad key."
  );
}

/**
 * The whitelabel booking site's host, or null.
 *
 * LiteAPI hosts a booking site for each account at `<name>.nuitee.link`, and it
 * takes deep links straight to one hotel. That is what makes a partner hotel
 * genuinely bookable without this platform touching the money: the guest lands
 * on a checkout that revalidates the rate, takes the card and confirms with the
 * supplier, and we earn the commission on it. The failure mode that panel
 * warned about in HYBRID_INVENTORY section 7 (money captured here, supplier
 * confirmation failed) cannot happen, because we never capture.
 *
 * It is a separate environment variable from the key on purpose. The site has
 * to be switched on and named in their dashboard, which is a step after getting
 * a key, so the two arrive at different times and the product has to be correct
 * in between: with a key and no whitelabel, partner hotels carry a price and
 * say plainly that they are not bookable here.
 *
 * Accepts `name.nuitee.link` or `https://name.nuitee.link`, with or without a
 * trailing slash, and refuses anything carrying a path, a query or whitespace,
 * because this value is interpolated into a URL a guest is sent to.
 */
export function whitelabelHost(): string | null {
  const raw = (process.env.LITEAPI_WHITELABEL_DOMAIN ?? "").trim();
  if (raw.length === 0) return null;
  const host = raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+$/i.test(host) ? host : null;
}

/**
 * Where a guest completes this booking, or null when no site is configured.
 *
 * The dates are the SAME window the price was quoted for, which is the whole
 * point of building this here rather than in the component: a link that opened
 * on different dates from the ones on the card would show a different number
 * the moment it loaded.
 *
 * Occupancy is deliberately NOT passed. Their deep link accepts an
 * `occupancies` parameter but the documented encoding is ambiguous, and a
 * malformed one risks breaking the page a paying guest just landed on. It does
 * not need to be passed anyway: the site defaults to one room for two adults,
 * which is exactly what `fetchRates` quotes, so leaving it off lands the guest
 * on the occupancy we priced rather than despite it.
 */
export function bookingUrl(hotelId: string, window: { checkin: string; checkout: string }): string | null {
  const host = whitelabelHost();
  if (!host) return null;
  const query = new URLSearchParams({ checkin: window.checkin, checkout: window.checkout });
  return `https://${host}/hotels/${encodeURIComponent(hotelId)}?${query.toString()}`;
}

/** `YYYY-MM-DD`, `offsetDays` from today, in UTC. */
function isoDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * The window a shelf price is quoted for: one night, starting tomorrow, two
 * adults, matching the booking site's own default.
 *
 * Discovery carries no dates (`ListingSearchFilter` has none, and the search
 * surface does not ask for any), so a partner hotel on a shelf has to be priced
 * for SOME window or priced not at all. The window is chosen to match the
 * whitelabel checkout a guest is sent to, so that tapping Book does not change
 * the number in front of them.
 *
 * A guest whose real dates differ will see a different number at the point they
 * choose dates. That is why the card price is an indication and why this
 * provider ships no Reserve button: nothing here is presented as a rate we have
 * held for anybody.
 */
function stayWindow(): { checkin: string; checkout: string } {
  return { checkin: isoDay(1), checkout: isoDay(2) };
}

/* ------------------------------------------------------------- static content cache */

export type HotelContent = {
  readonly hotelId: string;
  readonly name: string;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly area: string | null;
  readonly photos: readonly string[];
};

const contentCache = new Map<string, { value: HotelContent[]; expires: number }>();

function readContentCache(cityName: string): HotelContent[] | null {
  const hit = contentCache.get(cityName);
  if (!hit) return null;
  if (hit.expires <= Date.now()) {
    contentCache.delete(cityName);
    return null;
  }
  return hit.value;
}

/* --------------------------------------------------------------------------- reading
 *
 * Every field below is read defensively through the shared readers, and that is
 * load bearing rather than ceremonial here. LiteAPI's own documentation spells
 * some fields two ways across pages (`main_photo` and `mainPhoto`,
 * `hotelImages` entries keyed `url` and `urlHd`), so each reader tries the
 * spellings it has seen and a hotel whose shape is unrecognised is SKIPPED. The
 * failure mode is a thinner shelf, never a thrown page.
 */

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
}

function firstNumber(record: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

/** Photo URLs from whichever of the documented image shapes came back. */
function photosFrom(hotel: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const main = firstString(hotel, ["main_photo", "mainPhoto", "thumbnail"]);
  if (main) urls.push(main);

  for (const entry of asArray(hotel["hotelImages"])) {
    if (urls.length >= PHOTO_LIMIT) break;
    const image = asRecord(entry);
    if (!image) continue;
    const url = firstString(image, ["url", "urlHd"]);
    // Only absolute https, because these go straight into an <img> and a
    // relative path would resolve against our own origin.
    if (url && /^https:\/\//i.test(url) && !urls.includes(url)) urls.push(url);
  }
  return urls.slice(0, PHOTO_LIMIT);
}

function readHotel(entry: unknown): HotelContent | null {
  const hotel = asRecord(entry);
  if (!hotel) return null;
  const hotelId = firstString(hotel, ["id", "hotelId"]);
  const name = firstString(hotel, ["name", "hotelName"]);
  if (!hotelId || !name) return null;

  return {
    hotelId,
    name,
    lat: firstNumber(hotel, ["latitude", "lat"]),
    lng: firstNumber(hotel, ["longitude", "lng"]),
    area: firstString(hotel, ["city", "cityName"]),
    photos: photosFrom(hotel),
  };
}

/**
 * The cheapest naira nightly rate for a hotel, or null.
 *
 * A hotel comes back as room types, each holding rates, each holding a retail
 * total. The lowest is taken because a shelf price is a "from" price, and every
 * candidate has to clear the same two gates: the currency must be NGN, and the
 * amount must survive `decimalToMinor` as exact integer kobo.
 *
 * The amount arrives as a JSON NUMBER here (412.76) rather than the decimal
 * STRING Amadeus sent, so it is stringified and handed to the same parser
 * instead of being multiplied by 100. That keeps every money path in this
 * directory on one integer-only implementation, and it means an amount in
 * exponent form or with more precision than kobo can hold is refused rather
 * than rounded into a wrong price.
 */
function cheapestNgnMinor(
  hotelRates: Record<string, unknown>,
  notes: string[],
): { minor: number; offerRef: string | null } | null {
  let best: { minor: number; offerRef: string | null } | null = null;
  let sawForeign = false;

  for (const roomEntry of asArray(hotelRates["roomTypes"])) {
    const roomType = asRecord(roomEntry);
    if (!roomType) continue;

    for (const rateEntry of asArray(roomType["rates"])) {
      const rate = asRecord(rateEntry);
      if (!rate) continue;
      const retail = asRecord(rate["retailRate"]);
      if (!retail) continue;

      for (const totalEntry of asArray(retail["total"])) {
        const total = asRecord(totalEntry);
        if (!total) continue;

        const currency = asString(total["currency"]);
        if (currency !== "NGN") {
          sawForeign = true;
          continue;
        }
        const amount = asNumber(total["amount"]);
        if (amount === null || amount <= 0) continue;

        const minor = decimalToMinor(String(amount));
        if (minor === null || minor <= 0) continue;

        if (!best || minor < best.minor) {
          best = {
            minor,
            offerRef: firstString(roomType, ["offerId", "rateId"]) ?? asString(rate["rateId"]),
          };
        }
      }
    }
  }

  if (!best && sawForeign) {
    notes.push("liteapi: every offer was quoted in a currency other than NGN and was dropped");
  }
  return best;
}

/* ------------------------------------------------------------------------- mapping */

function toListing(
  content: HotelContent,
  priced: { minor: number; offerRef: string | null },
  fallbackCity: PartnerCity,
): Listing {
  const placed =
    content.lat !== null && content.lng !== null ? nearestCity(content.lat, content.lng) : null;
  const city = placed ?? fallbackCity;
  const id = partnerId("liteapi", content.hotelId);
  // Same window the rate above was quoted for. See `bookingUrl`.
  const book = bookingUrl(content.hotelId, stayWindow());

  return {
    id,
    slug: [slugify(content.name), slugify(city.name)].filter((p) => p.length > 0).join("-") || id,
    title: content.name,
    // The feed sells nights in properties. Google's classifier decides between
    // lodging and food because Places returns both; this endpoint returns only
    // hotels, so there is nothing to classify.
    kind: "hotel",
    // The feed's own city string is the better area label when it is more
    // specific than the covered city we searched from ("Ikeja" against
    // "Lagos"); otherwise the city stands in for itself, as it does for Places.
    area: content.area && content.area.toLowerCase() !== city.name.toLowerCase()
      ? content.area
      : city.name,
    city: city.name,
    state: city.state,
    ...(content.lat !== null && content.lng !== null
      ? { lat: content.lat, lng: content.lng }
      : {}),
    priceMinor: priced.minor,
    currency: "NGN",
    source: "partner",
    partner: {
      provider: "liteapi",
      // Absent until the whitelabel site is configured, and the detail panel
      // reads that absence as "priced here, not bookable here" rather than
      // rendering a button that goes nowhere.
      ...(book ? { bookUrl: book } : {}),
      ...(priced.offerRef ? { offerRef: priced.offerRef } : {}),
    },
    // The rates call prices a room, not a floor plan, and the content call does
    // not describe one. Zero is what the card already renders as "not stated"
    // for partner stock; inventing a bedroom count would put a number under a
    // filter that would then act on it.
    bedrooms: 0,
    bathrooms: 0,
    /* LiteAPI's `rating` is a STAR rating awarded to the property, not a score
       left by guests, and `Listing.rating` is read next to `reviewCount` and
       rendered as guest opinion. Publishing four stars as "4.0 from 0 reviews"
       would be a different claim from the one the feed is making, so both stay
       zero and the card shows no rating at all. */
    rating: 0,
    reviewCount: 0,
    verified: false,
    // No Reserve button on stock we cannot confirm. See the header.
    instantBook: false,
    /* Deliberately empty. `amenities` holds the platform's own amenity CODES,
       the ones the agent flow writes and the filter matches with AND semantics.
       LiteAPI's facility vocabulary is its own, so mapping it in would either
       never match a filter or, worse, collide with a code and match the wrong
       thing. A partner hotel therefore states no amenities rather than states
       them in a language the filter does not speak. */
    amenities: [],
    photos: [...content.photos],
    hue: hueFor(id),
  };
}

/* -------------------------------------------------------------------- the provider */

async function fetchContent(
  key: string,
  city: PartnerCity,
  deadline: number,
): Promise<{ hotels: HotelContent[] } | { error: string }> {
  const cached = readContentCache(city.name);
  if (cached) return { hotels: cached };

  /* Searched by coordinate rather than by `cityName`, on purpose. The name
     search requires the caller's spelling to match LiteAPI's own city list
     exactly, and our covered list carries names it may well spell differently
     ("Port Harcourt", "Benin City", "Ado Ekiti"). A mismatch there returns zero
     hotels and looks identical to a city we have no supply in. A radius around
     the capital cannot be spelled wrong. */
  const query = new URLSearchParams({
    countryCode: "NG",
    latitude: String(city.lat),
    longitude: String(city.lng),
    radius: String(RADIUS_M),
    limit: String(HOTEL_LIMIT),
  });

  const outcome = await requestJson<unknown>(
    `${BASE_URL}/data/hotels?${query.toString()}`,
    { method: "GET", headers: { accept: "application/json", "X-API-Key": key } },
    deadline,
  );
  if (!outcome.ok) return { error: outcome.reason };

  const body = asRecord(outcome.data);
  const hotels: HotelContent[] = [];
  for (const entry of asArray(body?.["data"])) {
    const hotel = readHotel(entry);
    if (hotel) hotels.push(hotel);
  }

  // Only a non-empty answer is worth holding for six hours. An empty one is
  // more likely a bad minute upstream than a city with no hotels in it.
  if (hotels.length > 0) {
    contentCache.set(city.name, { value: hotels, expires: Date.now() + CONTENT_TTL_MS });
  }
  return { hotels };
}

async function fetchRates(
  key: string,
  hotelIds: readonly string[],
  deadline: number,
): Promise<{ rates: Map<string, Record<string, unknown>> } | { error: string }> {
  const { checkin, checkout } = stayWindow();
  const outcome = await requestJson<unknown>(
    `${BASE_URL}/hotels/rates`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-API-Key": key,
      },
      body: JSON.stringify({
        hotelIds: [...hotelIds],
        checkin,
        checkout,
        // Ask for naira. The answer's own currency is still checked before any
        // amount is believed.
        currency: "NGN",
        guestNationality: "NG",
        /* Two adults, matching the whitelabel booking site's own default of
           "1 room, 2 Guests". This is the number that keeps the card and the
           checkout telling the same story: quote one adult here and a guest
           reads a price, taps Book, and lands on a page quoting more for the
           same hotel on the same night. Nothing about that would look like a
           default occupancy to them; it would look like a bait price.

           It was one adult first, copied from the Amadeus provider for
           consistency between two rate feeds. That reasoning died with Amadeus,
           and agreeing with the page we actually send people to is worth more
           than agreeing with a provider that cannot answer. */
        occupancies: [{ adults: 2 }],
      }),
    },
    deadline,
  );
  if (!outcome.ok) return { error: outcome.reason };

  const body = asRecord(outcome.data);
  const rates = new Map<string, Record<string, unknown>>();
  for (const entry of asArray(body?.["data"])) {
    const hotelRates = asRecord(entry);
    if (!hotelRates) continue;
    const hotelId = firstString(hotelRates, ["hotelId", "id"]);
    if (hotelId) rates.set(hotelId, hotelRates);
  }
  return { rates };
}

/**
 * Content and rates, joined.
 *
 * Exported for tests, which is what lets the whole mapping be proved without a
 * network: the two payload shapes go in, listings come out, and every rule this
 * file claims (naira only, integer kobo, never verified, priced or dropped) is
 * checkable on real-shaped fixtures.
 */
export function joinContentAndRates(
  hotels: readonly HotelContent[],
  rates: Map<string, Record<string, unknown>>,
  city: PartnerCity,
  notes: string[],
): Listing[] {
  const listings: Listing[] = [];
  let unpriced = 0;

  for (const hotel of hotels) {
    const hotelRates = rates.get(hotel.hotelId);
    if (!hotelRates) {
      unpriced += 1;
      continue;
    }
    const priced = cheapestNgnMinor(hotelRates, notes);
    if (!priced) {
      unpriced += 1;
      continue;
    }
    listings.push(toListing(hotel, priced, city));
  }

  /* A hotel with no naira rate for the quoted window is DROPPED rather than
     shown priceless. Places already fills the shelf with hotels that have no
     price; the entire reason this provider exists is to contribute ones that
     do, and an unpriced duplicate of a Places card is worse than nothing
     because de-duplication would then have to choose between two records that
     say the same little. */
  if (unpriced > 0) {
    notes.push(`liteapi: ${unpriced} hotel(s) had no NGN rate for the quoted night and were dropped`);
  }
  return listings;
}

export const liteapiProvider: InventoryProvider = {
  name: "liteapi",

  async search(filter: ListingSearchFilter): Promise<ProviderResult> {
    const key = apiKey();
    if (!key) return providerNoKey("liteapi");
    // This feed sells nights in hotels and nothing else.
    if (filter.kind && filter.kind !== "hotel") return providerNotApplicable("liteapi");

    const deadline = Date.now() + BUDGET_MS;
    const notes: string[] = [];
    /* Carried on every outcome, not only the failing one. A key of the wrong
       shape that somehow works is worth knowing about too. */
    const shape = liteapiKeyShapeNote();
    if (shape) notes.push(shape);

    try {
      const city = cityForFilter(filter);

      const content = await fetchContent(key, city, deadline);
      if ("error" in content) return providerError("liteapi", content.error, notes);
      if (content.hotels.length === 0) return providerOk("liteapi", [], notes);

      // Two sequential hops share one budget, so the second is not attempted at
      // all when the first spent it. Without this the provider could sit at
      // twice its own ceiling and be cut off by the caller's timeout instead,
      // which loses the work rather than declining to start it.
      if (remaining(deadline) <= 0) return providerTimeout("liteapi");

      const ids = content.hotels.slice(0, HOTEL_LIMIT).map((hotel) => hotel.hotelId);
      const rates = await fetchRates(key, ids, deadline);
      if ("error" in rates) return providerError("liteapi", rates.error, notes);

      return providerOk("liteapi", joinContentAndRates(content.hotels, rates.rates, city, notes), notes);
    } catch (error) {
      // The contract is that this never rejects. The shared HTTP path already
      // turns every network fault into an outcome, so reaching here means a
      // programming fault in the mapping, and it is still not allowed to break
      // a page.
      const reason = error instanceof Error ? error.message : "unknown mapping failure";
      return providerError("liteapi", reason, notes);
    }
  },
};

/** One hotel by its upstream id, for the detail page a partner card links to. */
export async function liteapiHotelById(hotelId: string): Promise<Listing | null> {
  const key = apiKey();
  if (!key) return null;

  const deadline = Date.now() + BUDGET_MS;
  const notes: string[] = [];

  try {
    const outcome = await requestJson<unknown>(
      `${BASE_URL}/data/hotel?hotelId=${encodeURIComponent(hotelId)}`,
      { method: "GET", headers: { accept: "application/json", "X-API-Key": key } },
      deadline,
    );
    if (!outcome.ok) return null;

    const body = asRecord(outcome.data);
    // The single-hotel endpoint answers with one object where the list answers
    // with an array, so both shapes are accepted rather than assumed.
    const payload = asRecord(body?.["data"]) ?? asRecord(asArray(body?.["data"])[0]);
    const content = readHotel(payload);
    if (!content) return null;

    if (remaining(deadline) <= 0) return null;
    const rates = await fetchRates(key, [content.hotelId], deadline);
    if ("error" in rates) return null;

    const city =
      (content.lat !== null && content.lng !== null
        ? nearestCity(content.lat, content.lng)
        : null) ?? cityForFilter({});

    return joinContentAndRates([content], rates.rates, city, notes)[0] ?? null;
  } catch {
    return null;
  }
}
