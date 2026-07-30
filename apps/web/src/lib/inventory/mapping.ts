import type { ListingSearchFilter } from "../listings/types";
import type { PartnerProviderName } from "./types";

/**
 * Shared mapping rules for partner stock.
 *
 * Both providers answer a filter that only carries free text and a category, so
 * both need the same three things: a way to turn that free text into a real
 * place to search, a way to turn a decimal price string into integer kobo
 * without ever touching floating point money, and a stable id scheme so a
 * partner card can deep link into a detail page that refetches its own data.
 */

export type PartnerCity = {
  /** Display name, matching the city names the catalogue and map already use. */
  readonly name: string;
  /** State name, matching `Listing.state`. */
  readonly state: string;
  readonly lat: number;
  readonly lng: number;
  /** Extra spellings a visitor might type. */
  readonly aliases: readonly string[];
};

/**
 * The covered cities, with the same coordinates the search map pins use. Partner
 * inventory is only ever fetched for one of these, so a partner result can
 * always be placed on the map and filtered by city exactly like a first-party
 * one.
 */
export const PARTNER_CITIES: readonly PartnerCity[] = [
  { name: "Lagos", state: "Lagos", lat: 6.5244, lng: 3.3792, aliases: ["eko", "ikeja", "lekki", "ikoyi", "victoria island"] },
  { name: "Abuja", state: "FCT", lat: 9.0765, lng: 7.3986, aliases: ["fct", "wuse", "maitama", "gwarinpa"] },
  { name: "Port Harcourt", state: "Rivers", lat: 4.8156, lng: 7.0498, aliases: ["port-harcourt", "portharcourt", "phc", "rivers"] },
  { name: "Ibadan", state: "Oyo", lat: 7.3775, lng: 3.947, aliases: ["oyo", "bodija"] },
  { name: "Enugu", state: "Enugu", lat: 6.4584, lng: 7.5464, aliases: [] },
  { name: "Calabar", state: "Cross River", lat: 4.9757, lng: 8.3417, aliases: ["cross river"] },
];

/** Lagos leads the market, so an unplaced search looks there. */
export const DEFAULT_PARTNER_CITY: PartnerCity = PARTNER_CITIES[0]!;

/** The first covered city named anywhere in the query, or null. */
export function resolveCity(q: string | undefined): PartnerCity | null {
  const text = q?.trim().toLowerCase();
  if (!text) return null;
  for (const city of PARTNER_CITIES) {
    if (text.includes(city.name.toLowerCase())) return city;
    if (text.includes(city.state.toLowerCase())) return city;
    for (const alias of city.aliases) if (text.includes(alias)) return city;
  }
  return null;
}

/**
 * Which city a partner call should cover for this filter.
 *
 * One city per search keeps the partner half of a result set to a bounded
 * number of upstream calls. When the query names a covered city we search
 * there; otherwise we search the default market and let the shared filter
 * decide, which is what makes a query like "eko hotel" work by title.
 */
export function cityForFilter(filter: ListingSearchFilter): PartnerCity {
  return resolveCity(filter.q) ?? DEFAULT_PARTNER_CITY;
}

/** Kilometres per degree, near enough for placing a venue in a city. */
const KM_PER_DEG_LAT = 110.57;
const KM_PER_DEG_LNG = 111.32;

/** Beyond this a coordinate belongs to none of the covered cities. */
const CITY_RADIUS_KM = 120;

/**
 * The covered city a coordinate sits in, or null when it sits in none of them.
 *
 * Partner feeds answer with a geocode rather than an area name, and a listing
 * needs a real city and state to be filtered, sorted and pinned like the rest
 * of the catalogue. Flat-earth arithmetic is fine at this scale: we are choosing
 * between cities hundreds of kilometres apart, not measuring a walk.
 */
export function nearestCity(lat: number, lng: number): PartnerCity | null {
  let best: { city: PartnerCity; km: number } | null = null;
  for (const city of PARTNER_CITIES) {
    const dy = (lat - city.lat) * KM_PER_DEG_LAT;
    const dx = (lng - city.lng) * KM_PER_DEG_LNG * Math.cos((lat * Math.PI) / 180);
    const km = Math.sqrt(dx * dx + dy * dy);
    if (!best || km < best.km) best = { city, km };
  }
  return best && best.km <= CITY_RADIUS_KM ? best.city : null;
}

/**
 * A plain decimal amount as integer minor units, or null when the string is not
 * a plain decimal.
 *
 * Amadeus prices arrive as decimal STRINGS ("187500.00"). Parsing them as
 * floats and multiplying by 100 is how money bugs are born, so the integer and
 * fractional halves are read separately and never leave integer arithmetic.
 * Anything with a currency symbol, a thousands separator, a sign or an
 * unexpected shape is refused rather than guessed at.
 */
export function decimalToMinor(value: string): number | null {
  const match = /^(\d{1,15})(?:\.(\d{1,6}))?$/.exec(value.trim());
  if (!match) return null;
  const whole = match[1]!;
  // Three digits is enough: two become kobo, the third rounds them.
  const fraction = (match[2] ?? "").padEnd(3, "0").slice(0, 3);
  const wholeKobo = Number(whole) * 100;
  const kobo = Number(fraction.slice(0, 2));
  const roundUp = Number(fraction.slice(2, 3)) >= 5 ? 1 : 0;
  const total = wholeKobo + kobo + roundUp;
  return Number.isSafeInteger(total) ? total : null;
}

/** Lowercase hyphenated slug part, matching the catalogue's slug style. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Deterministic gradient hue for the card fallback tile, 0 to 5. */
export function hueFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) % 6;
  return h;
}

/**
 * Partner listing ids.
 *
 * `partner-<provider>-<upstream reference>`. The prefix is load bearing: the
 * repository routes a detail lookup on it, so a partner card can link into
 * `/listing/[id]` like any other card and the page refetches that one venue
 * from its provider instead of expecting a row we do not own.
 */
const PARTNER_ID_PREFIX = "partner";

export function partnerId(provider: PartnerProviderName, reference: string): string {
  return `${PARTNER_ID_PREFIX}-${provider}-${reference}`;
}

export function parsePartnerId(
  id: string,
): { provider: PartnerProviderName; reference: string } | null {
  for (const provider of ["amadeus", "places"] as const) {
    const head = `${PARTNER_ID_PREFIX}-${provider}-`;
    if (id.startsWith(head)) {
      const reference = id.slice(head.length);
      return reference.length > 0 ? { provider, reference } : null;
    }
  }
  return null;
}

/** True for any id minted by this layer. Cheap enough to gate a lookup on. */
export function isPartnerId(id: string): boolean {
  return id.startsWith(`${PARTNER_ID_PREFIX}-`);
}
