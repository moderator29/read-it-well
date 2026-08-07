import type { Listing } from "../listings/types";
import { PARTNER_CITIES } from "./mapping";

/**
 * One real place, however many feeds describe it.
 *
 * This exists because the platform now has three sources that overlap on the
 * same buildings: agent inventory in Postgres, hotels from Google Places, and
 * hotels from LiteAPI. In Lagos and Abuja that overlap is not an edge case, it
 * is most of the shelf, and a visitor who scrolls past the same hotel three
 * times under three spellings does not conclude that we have deep supply. They
 * conclude the catalogue is broken.
 *
 * What was here before was one line: same category, same letters in the title,
 * same city. It caught "Eko Hotel" twice and nothing else, because two feeds
 * never spell a Nigerian property the same way:
 *
 *   Eko Hotel & Suites          Eko Hotels and Suites
 *   The George, Ikoyi           The George Lagos
 *   Transcorp Hilton Abuja      Transcorp Hilton
 *
 * All three pairs are one building and none of them matched. So matching is
 * done on two independent signals, and BOTH have to agree:
 *
 * 1. **Where it is.** Within `SAME_PLACE_M` metres, by haversine.
 * 2. **What it is called.** Token containment after the category nouns are
 *    stripped, so "Eko Hotel & Suites" and "Eko Hotels and Suites" both reduce
 *    to {eko}.
 *
 * Requiring both is the whole safety argument. Name alone merges the two
 * unrelated Bogobiri Houses, one in Ikoyi and one in Calabar. Distance alone
 * merges a hotel with the shortlet block next door, which is two real listings
 * from two real hosts. Neither signal is trusted on its own, ever.
 *
 * When a coordinate is missing the geometry cannot vote, and rather than fall
 * back to name-only (which is the unsafe half) the rule tightens to exactly
 * what it used to be: identical normalised name AND identical city. That is
 * deliberately strict. A missed duplicate shows a place twice, which is untidy.
 * A wrong merge hides a real host's listing behind somebody else's, which is
 * the kind of fault a host reports as "you deleted my property".
 */

/**
 * How far apart two pins for the same building can be.
 *
 * Not a guess: an agent drops a pin from a phone at the gate, Google geocodes
 * the registered street address, and LiteAPI carries whatever the property told
 * its channel manager. On the Lekki-Epe axis those three routinely disagree by
 * 50 to 100 metres for the same compound. 150 tolerates that drift while
 * staying well inside the distance to a genuinely separate property, and it
 * never decides anything alone: the name still has to agree.
 */
const SAME_PLACE_M = 150;

/** Fraction of the smaller name's distinctive tokens that must be shared. */
const NAME_CONTAINMENT = 0.6;

/**
 * A single shared token can carry a match only if it is this long.
 *
 * Three, not four, and the difference is not academic: this started at four and
 * the tests caught it rejecting "Eko Hotel & Suites" against "Eko Hotels and
 * Suites". Once the category nouns are stripped both names are the single token
 * {eko}, which is three characters and is the most distinctive word in the name
 * of one of the best known hotels in Lagos. A rule that cannot match Eko is not
 * a rule worth having.
 *
 * Three still stops what this guard is actually for, which is abbreviations:
 * {vi}, {ph} and {ng} are two characters and half of Lagos answers to the
 * first of them.
 */
const MIN_SOLO_TOKEN = 3;

/**
 * Words that describe the category rather than the property.
 *
 * Stripping these is what makes the three real pairs above match. The list is
 * deliberately short and holds only category nouns, legal suffixes and
 * connectives. A distinctive word never goes in here, however common it looks:
 * "Grand", "Royal" and "Continental" are how Nigerian properties are actually
 * told apart, and removing them would merge buildings that share a street.
 */
const GENERIC_TOKENS: ReadonlySet<string> = new Set([
  "the", "and", "at", "by", "de", "of", "in", "on",
  "hotel", "hotels", "motel", "inn", "inns", "lodge", "lodges",
  "suite", "suites", "resort", "resorts", "spa",
  "apartment", "apartments", "apartmnt", "apt", "apts", "flat", "flats",
  "shortlet", "shortlets", "guesthouse", "guest", "house", "houses", "home", "homes",
  "hostel", "villa", "villas", "residence", "residences", "place", "places",
  "restaurant", "restaurants", "eatery", "cafe", "cuisine", "kitchen",
  "ltd", "limited", "plc", "inc", "nig", "nigeria", "ng", "international",
]);

/**
 * A title as comparable tokens.
 *
 * Diacritics are folded before anything else, because Nigerian property names
 * carry them inconsistently across feeds: "Ìtàn Test Kitchen" and "Itan Test
 * Kitchen" are one restaurant, and a byte comparison says otherwise.
 */
export function nameTokens(title: string): string[] {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Place names, which inside a TITLE are as generic as the category nouns.
 *
 * Built from the covered cities rather than typed out again, so a state added
 * to `PARTNER_CITIES` is understood here on the same day.
 *
 * The reason this is stripped is the second real pair: "The George, Ikoyi" and
 * "The George Lagos" are one hotel, and the only thing they disagree about is
 * how much of the address the feed decided belonged in the name. Left in, those
 * two share {george} out of two tokens each, score 0.5, and are refused. Taken
 * out, both are {george} and they match.
 *
 * Nothing is lost by removing them, because location is not this function's
 * job: `sameProperty` has already required the two records to be within
 * `SAME_PLACE_M` metres of each other, which is a far better test of where a
 * building is than whether a feed typed the city into the title.
 */
const PLACE_TOKENS: ReadonlySet<string> = new Set(
  PARTNER_CITIES.flatMap((city) => [city.name, city.state, ...city.aliases]).flatMap((term) =>
    nameTokens(term),
  ),
);

/**
 * Just the distinctive tokens: what is left once category and place are gone.
 *
 * A place name is dropped only when the title has something else left to say,
 * and that condition is doing real work rather than guarding a corner. "Eko" is
 * in `PLACE_TOKENS` because it is what Lagos is called, and it is also the
 * entire distinctive content of "Eko Hotel & Suites". Stripping unconditionally
 * reduced that name to nothing, which is how the first attempt at this managed
 * to stop matching the very pair it was written for.
 *
 * So the rule is: a place name is a qualifier when it sits beside a real name,
 * and it IS the name when it does not. "The George, Ikoyi" keeps {george} and
 * drops the area. "Eko Hotel" keeps {eko}, because dropping it would leave the
 * comparison with no evidence at all.
 */
function distinctiveTokens(title: string): Set<string> {
  const named = nameTokens(title).filter((token) => !GENERIC_TOKENS.has(token));
  const withoutPlaces = named.filter((token) => !PLACE_TOKENS.has(token));
  return new Set(withoutPlaces.length > 0 ? withoutPlaces : named);
}

/**
 * The strict fallback key, used only where there is no geometry to vote with.
 *
 * This is the old rule, kept intact rather than softened, and it is why an
 * unplaced listing behaves today exactly as it behaved before this module
 * existed.
 */
export function strictKey(listing: Listing): string {
  return `${nameTokens(listing.title).join("")}|${listing.city.trim().toLowerCase()}`;
}

/**
 * Do two names describe the same property?
 *
 * Containment rather than Jaccard, because feeds disagree on how much of an
 * address belongs in the title. "The George" against "The George Lagos Ikoyi"
 * shares every distinctive token the shorter name has, which Jaccard scores at
 * 0.33 and rejects; containment scores it 1.0 and accepts, which is the right
 * answer. The cost of containment is that a short name is easier to swallow, so
 * a lone shared token has to clear `MIN_SOLO_TOKEN` and the geometry still has
 * to agree independently.
 */
export function namesMatch(titleA: string, titleB: string): boolean {
  const a = distinctiveTokens(titleA);
  const b = distinctiveTokens(titleB);

  // Both names were nothing but category nouns ("The Hotel", "Guest House").
  // There is no distinctive evidence either way, so fall back to the full
  // normalised string rather than declaring a match on emptiness.
  if (a.size === 0 || b.size === 0) {
    return nameTokens(titleA).join("") === nameTokens(titleB).join("");
  }

  const shared = [...a].filter((token) => b.has(token));
  if (shared.length === 0) return false;

  const smaller = Math.min(a.size, b.size);
  if (smaller === 1) {
    // One token is carrying the entire decision, so it has to be a real word.
    // A set of size one that shares anything shares exactly that one token.
    return shared[0]!.length >= MIN_SOLO_TOKEN;
  }
  return shared.length / smaller >= NAME_CONTAINMENT;
}

/** Metres between two coordinates. Haversine, on a spherical earth. */
export function distanceMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Which listings may be compared with which.
 *
 * Categories are NOT compared directly, because two sources legitimately file
 * the same building differently: an agent lists a serviced flat in Ikoyi as a
 * `shortlet`, Google returns the same address as `lodging` and it maps to
 * `hotel`. Blocking on the exact kind would miss every one of those, which is
 * the commonest duplicate the platform will actually see.
 *
 * What is blocked is comparison ACROSS classes, and that matters just as much:
 * a hotel and the restaurant inside it share a doorway and sometimes a word in
 * the name, and collapsing them would offer a table for two to somebody who
 * wanted a bed.
 */
function comparisonClass(kind: Listing["kind"]): string {
  switch (kind) {
    case "hotel":
    case "apartment":
    case "shortlet":
    case "villa":
    case "home":
      return "lodging";
    case "rental":
    case "shop":
    case "office":
    case "land":
      // The tenancy market. Priced by the year and never reserved by the night,
      // so it can never be the same product as a nightly stay even at the same
      // address: a flat let annually and the same block sold as shortlets are
      // two genuinely different offers.
      return "tenancy";
    default:
      return kind;
  }
}

/**
 * Are these two records the same real place?
 *
 * Exported because it is the whole rule, and a rule this consequential should
 * be testable on its own rather than only through the function that loops it.
 */
export function sameProperty(a: Listing, b: Listing): boolean {
  if (comparisonClass(a.kind) !== comparisonClass(b.kind)) return false;

  const placed =
    a.lat !== undefined && a.lng !== undefined && b.lat !== undefined && b.lng !== undefined;

  if (!placed) {
    // No geometry, so the tight rule: identical name and identical city.
    return strictKey(a) === strictKey(b);
  }

  const metres = distanceMetres({ lat: a.lat!, lng: a.lng! }, { lat: b.lat!, lng: b.lng! });
  if (metres > SAME_PLACE_M) return false;
  return namesMatch(a.title, b.title);
}

/**
 * How much a record is worth when two describe the same place.
 *
 * Higher wins. The order is the platform's trust rule turned into a number
 * (docs/HYBRID_INVENTORY.md sections 2 and 4):
 *
 * 3. First party. It is verified, it has an agent to message and an inspection
 *    path, and it is never replaced by a feed. This is not a tie-break, it is
 *    the rule the rest of the platform is built on.
 * 2. A partner record carrying a real naira price.
 * 1. A partner record with no price. Google Places answers with a price LEVEL
 *    rather than an amount, so its hotels show none. When Places and a rate
 *    feed both return the same hotel, which in Lagos is most of them, the one
 *    a guest can read a number off is strictly more useful, and without this
 *    rule the winner would be whichever provider happened to answer first.
 */
function strength(listing: Listing): number {
  if (listing.source !== "partner") return 3;
  return listing.priceMinor > 0 ? 2 : 1;
}

/**
 * One entry per real place, in the order the caller supplied.
 *
 * Position and record are decided separately, and that separation is the point.
 * The FIRST record of a place keeps its position, so first-party inventory
 * cannot be pushed down the page by a feed that happens to describe the same
 * hotel better. The STRONGEST record fills that position, so when two partner
 * feeds both return a hotel, the shelf shows the one a guest can actually book
 * rather than whichever provider answered first.
 *
 * Cost is quadratic within a comparison class, which is the honest shape of the
 * problem: "is this the same place" is not a key that can be hashed, since the
 * whole point is that the two records disagree about the name and the
 * coordinates. It is bounded in practice by how much a search returns, which is
 * tens of listings and a few thousand cheap comparisons, and the class split
 * means a restaurant is never compared to a hotel at all.
 */
export function dedupeListings(listings: readonly Listing[]): Listing[] {
  const kept: Listing[] = [];
  /** Positions in `kept`, grouped by comparison class. */
  const byClass = new Map<string, number[]>();
  /** Exact id matches, which need no geometry and no string work. */
  const seenIds = new Set<string>();

  for (const listing of listings) {
    if (seenIds.has(listing.id)) continue;

    const cls = comparisonClass(listing.kind);
    const candidates = byClass.get(cls);
    let duplicateAt = -1;
    if (candidates) {
      for (const index of candidates) {
        if (sameProperty(kept[index]!, listing)) {
          duplicateAt = index;
          break;
        }
      }
    }

    if (duplicateAt === -1) {
      seenIds.add(listing.id);
      const index = kept.push(listing) - 1;
      if (candidates) candidates.push(index);
      else byClass.set(cls, [index]);
      continue;
    }

    // Same place, already on the shelf. The position stands; the better record
    // may still take it. The displaced id is deliberately NOT remembered: it is
    // gone from the results, and remembering it would only matter if it arrived
    // again, at which point it would be caught as a duplicate anyway.
    if (strength(listing) > strength(kept[duplicateAt]!)) {
      seenIds.add(listing.id);
      kept[duplicateAt] = listing;
    }
  }

  return kept;
}
