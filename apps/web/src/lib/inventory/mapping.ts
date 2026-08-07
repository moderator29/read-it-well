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
 * Every state, with the city a search for it should actually look in.
 *
 * This list was six entries: Lagos, Abuja, Port Harcourt, Ibadan, Enugu and
 * Calabar. Thirty-one states had no coverage at all, so a search for Kano or
 * Jos fetched Lagos, failed the free-text filter, and returned nothing. Not a
 * wrong answer, but an empty one, which reads to a visitor as "there is
 * nothing in Kano" rather than as "we never looked".
 *
 * `state` matches `public.states.name` EXACTLY, including "FCT (Abuja)", which
 * is why that row does not simply say FCT. The catalogue files a listing under
 * that same string and the shared free-text matcher searches it, so a mismatch
 * here would silently stop a state's own listings matching its own name.
 *
 * Coordinates are the state capital, because that is where the inventory is
 * and because a partner search is biased to a radius around this point. The
 * aliases are the places people actually type instead of the capital: Aba for
 * Abia, Onitsha for Anambra, Warri for Delta, Zaria for Kaduna. They are not
 * exhaustive and are not meant to be, since a listing's own city and area text
 * is still searched by the shared matcher; they exist so that naming a
 * well-known city sends the partner call to the right part of the map.
 */
export const PARTNER_CITIES: readonly PartnerCity[] = [
  { name: "Lagos", state: "Lagos", lat: 6.5244, lng: 3.3792, aliases: ["eko", "ikeja", "lekki", "ikoyi", "victoria island", "yaba", "surulere", "ajah"] },
  { name: "Abuja", state: "FCT (Abuja)", lat: 9.0765, lng: 7.3986, aliases: ["fct", "abuja", "wuse", "maitama", "gwarinpa", "asokoro", "garki", "kubwa"] },
  { name: "Port Harcourt", state: "Rivers", lat: 4.8156, lng: 7.0498, aliases: ["port-harcourt", "portharcourt", "phc"] },
  { name: "Ibadan", state: "Oyo", lat: 7.3775, lng: 3.947, aliases: ["bodija", "ringroad", "ring road"] },
  { name: "Enugu", state: "Enugu", lat: 6.4584, lng: 7.5464, aliases: ["independence layout", "new haven"] },
  { name: "Calabar", state: "Cross River", lat: 4.9757, lng: 8.3417, aliases: ["marian", "calabar municipal"] },
  { name: "Umuahia", state: "Abia", lat: 5.525, lng: 7.494, aliases: ["aba", "abia"] },
  { name: "Yola", state: "Adamawa", lat: 9.2035, lng: 12.4954, aliases: ["jimeta"] },
  { name: "Uyo", state: "Akwa Ibom", lat: 5.0378, lng: 7.9128, aliases: ["eket", "ikot ekpene"] },
  { name: "Awka", state: "Anambra", lat: 6.2109, lng: 7.0741, aliases: ["onitsha", "nnewi"] },
  { name: "Bauchi", state: "Bauchi", lat: 10.3158, lng: 9.8442, aliases: ["azare"] },
  { name: "Yenagoa", state: "Bayelsa", lat: 4.9267, lng: 6.2676, aliases: [] },
  { name: "Makurdi", state: "Benue", lat: 7.7322, lng: 8.5391, aliases: ["gboko", "otukpo"] },
  { name: "Maiduguri", state: "Borno", lat: 11.8311, lng: 13.151, aliases: [] },
  { name: "Asaba", state: "Delta", lat: 6.198, lng: 6.728, aliases: ["warri", "sapele", "ughelli"] },
  { name: "Abakaliki", state: "Ebonyi", lat: 6.3249, lng: 8.1137, aliases: [] },
  { name: "Benin City", state: "Edo", lat: 6.335, lng: 5.6037, aliases: ["benin", "auchi", "ekpoma"] },
  { name: "Ado Ekiti", state: "Ekiti", lat: 7.6211, lng: 5.2214, aliases: ["ado-ekiti", "ikere"] },
  { name: "Gombe", state: "Gombe", lat: 10.2897, lng: 11.1673, aliases: [] },
  { name: "Owerri", state: "Imo", lat: 5.4836, lng: 7.0333, aliases: ["orlu"] },
  { name: "Dutse", state: "Jigawa", lat: 11.7564, lng: 9.3386, aliases: ["hadejia"] },
  { name: "Kaduna", state: "Kaduna", lat: 10.5222, lng: 7.4383, aliases: ["zaria", "barnawa"] },
  { name: "Kano", state: "Kano", lat: 12.0022, lng: 8.592, aliases: [] },
  { name: "Katsina", state: "Katsina", lat: 12.9908, lng: 7.6018, aliases: ["daura"] },
  { name: "Birnin Kebbi", state: "Kebbi", lat: 12.4539, lng: 4.1975, aliases: ["kebbi"] },
  { name: "Lokoja", state: "Kogi", lat: 7.8023, lng: 6.7333, aliases: ["okene"] },
  { name: "Ilorin", state: "Kwara", lat: 8.4966, lng: 4.5421, aliases: ["offa"] },
  { name: "Lafia", state: "Nasarawa", lat: 8.4939, lng: 8.5157, aliases: ["keffi"] },
  { name: "Minna", state: "Niger", lat: 9.614, lng: 6.5568, aliases: ["suleja", "bida"] },
  { name: "Abeokuta", state: "Ogun", lat: 7.1475, lng: 3.3619, aliases: ["ijebu ode", "sagamu", "ota"] },
  { name: "Akure", state: "Ondo", lat: 7.2571, lng: 5.2058, aliases: ["ondo town", "owo"] },
  { name: "Osogbo", state: "Osun", lat: 7.7827, lng: 4.5418, aliases: ["oshogbo", "ile ife", "ife", "ilesa"] },
  { name: "Jos", state: "Plateau", lat: 9.8965, lng: 8.8583, aliases: ["rayfield"] },
  { name: "Sokoto", state: "Sokoto", lat: 13.0059, lng: 5.2476, aliases: [] },
  { name: "Jalingo", state: "Taraba", lat: 8.894, lng: 11.3594, aliases: [] },
  { name: "Damaturu", state: "Yobe", lat: 11.748, lng: 11.966, aliases: ["potiskum"] },
  { name: "Gusau", state: "Zamfara", lat: 12.1704, lng: 6.6641, aliases: [] },
];

/** Lagos leads the market, so an unplaced search looks there. */
export const DEFAULT_PARTNER_CITY: PartnerCity = PARTNER_CITIES[0]!;

/**
 * The first covered place named anywhere in the query, or null.
 *
 * Matched on WHOLE WORDS, longest needle first, and both halves of that are
 * load-bearing rather than tidy. Plain `includes` was the original rule and it
 * put three states in the wrong place the moment the list grew past six:
 *
 *   "Taraba"        contains "aba", the alias for Abia
 *   "Asaba"         contains "aba" too, so Delta's own capital found Abia
 *   "nassarawa gra" contained "gra", which used to be an alias for Rivers
 *
 * None of these fail loudly. The search runs, looks in the wrong state, finds
 * nothing matching the text, and returns an empty page that reads as "we have
 * nothing there". A unit test found all three; a person would have reported it
 * as "search is broken in the north" and nobody would have known where to look.
 *
 * Longest first because the needles genuinely overlap, so a query naming
 * "Cross River" is not won by a shorter needle sitting inside it. The capital,
 * the state name and every alias are all needles, so "hotels in Rivers" and
 * "hotels in Port Harcourt" reach the same place.
 */
const NEEDLES: readonly { pattern: RegExp; city: PartnerCity }[] = PARTNER_CITIES.flatMap(
  (city) => [city.name, city.state, ...city.aliases].map((term) => ({ term, city })),
)
  .sort((a, b) => b.term.length - a.term.length)
  .map(({ term, city }) => ({
    // State names carry brackets ("FCT (Abuja)") and aliases carry hyphens, so
    // the term is escaped before it becomes a pattern.
    pattern: new RegExp(`\\b${term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`),
    city,
  }));

/**
 * True when the query is a PLACE and nothing else.
 *
 * `resolveCity` answers "which covered city is named anywhere in here", which
 * is the right question for choosing where to search and the wrong one for
 * deciding what to search FOR. "eko hotel" names Lagos by implication and is
 * plainly a subject; "Lagos" names Lagos and is plainly a location.
 *
 * Whole-query match, not a substring, so only a bare place name counts. Anything
 * with another word in it keeps its role as the subject, which is what makes
 * "Lagos hotels" and "hotels in Lekki" behave sensibly without a parser.
 */
export function queryIsPlaceName(q: string | undefined): boolean {
  const text = q?.trim().toLowerCase();
  if (!text) return false;
  return PARTNER_CITIES.some((city) =>
    [city.name, city.state, ...city.aliases].some((term) => term.toLowerCase() === text),
  );
}

export function resolveCity(q: string | undefined): PartnerCity | null {
  const text = q?.trim().toLowerCase();
  if (!text) return null;
  for (const { pattern, city } of NEEDLES) {
    if (pattern.test(text)) return city;
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
  for (const provider of ["places", "liteapi"] as const) {
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
