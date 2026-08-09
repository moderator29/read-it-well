import type { ListingIntent } from "./pricing";
import type { Listing, ListingKind, ListingSearchFilter } from "./types";

/**
 * Filter and ranking semantics, in one place.
 *
 * The server and the browser must answer the same question the same way: the
 * filter drawer counts what a pending filter set would leave, and the
 * repository applies the same set against Postgres. Both import from here, so
 * there is exactly one definition of "matches this search" and one definition
 * of "a good recommendation rail" in the codebase.
 *
 * This module is deliberately free of server-only imports. The filter drawer
 * imports `matchesFacts` in the browser to count how many places a pending set
 * of filters would leave, and that count must be produced by the same code the
 * server will run, not by a second implementation that can drift.
 */

/** Case-insensitive haystack for free text matching. */
export function haystack(l: Listing): string {
  return `${l.title} ${l.area} ${l.city} ${l.state} ${l.kind}`.toLowerCase();
}

/**
 * The part of a listing the structured filters actually read.
 *
 * Everything here is a fact about the place, none of it is presentation, so it
 * is safe and cheap to hand to the browser for a live match count.
 */
export type ListingFacts = {
  /**
   * The market this place is in.
   *
   * Carried here because the category is a FILTER now rather than a rail above
   * the results. The drawer's live match count runs in the browser against this
   * shape alone, so a category the facts could not answer would have left the
   * button reporting the count for the old category while the reader looked at
   * a new one, which is the one number on that screen anybody trusts.
   */
  kind: ListingKind;
  priceMinor: number;
  /**
   * To let, or for sale. Absent reads as "rent", which is what the seed
   * catalogue is and what every row that predates the distinction was.
   */
  intent?: ListingIntent;
  bedrooms: number;
  bathrooms: number;
  /** The host's declared capacity, where the source carries one. */
  maxGuests?: number;
  amenities: string[];
  instantBook: boolean;
  verified: boolean;
  /**
   * True when this illustrates the catalogue and no such property exists.
   *
   * Carried in the facts for the same reason `verified` is: the drawer's live
   * match count runs in the browser against this shape alone, so a filter that
   * can hide example listings has to be answerable here or the count and the
   * server would disagree.
   */
  isDemo: boolean;
  source?: "rentme";
  /**
   * Light and water, where the host has answered.
   *
   * Carried in the facts rather than looked up later because the drawer's
   * match count runs in the browser against this shape alone, and a count that
   * silently ignored a filter it could not see would be worse than no count.
   * Absent means unanswered, which every predicate below treats as "no".
   */
  utilities?: Listing["utilities"];
};

/** Just the facts, for shipping a candidate set to the drawer. */
export function factsOf(l: Listing): ListingFacts {
  return {
    kind: l.kind,
    priceMinor: l.priceMinor,
    ...(l.intent !== undefined ? { intent: l.intent } : {}),
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    ...(l.maxGuests !== undefined ? { maxGuests: l.maxGuests } : {}),
    amenities: l.amenities,
    instantBook: l.instantBook,
    verified: l.verified,
    isDemo: l.isDemo,
    source: l.source,
    ...(l.utilities !== undefined ? { utilities: l.utilities } : {}),
  };
}

/**
 * True when the host says there is a way to keep the lights on.
 *
 * `NONE` is a real answer and it is a no. So is the absence of an answer: a
 * listing that never said cannot be offered to somebody who asked, which is
 * the whole difference between this and a tick box nobody has to fill in.
 */
export function hasBackupPower(facts: ListingFacts): boolean {
  const backup = facts.utilities?.powerBackup;
  return backup !== undefined && backup !== "NONE";
}

/**
 * How many people a place takes, or null when that is not a knowable thing
 * about it.
 *
 * The host's own number wins whenever the source states one. Agent inventory
 * always states one: `listings.max_guests` is collected at step 5 of the
 * listing wizard, is checked above zero in the database, and is the number the
 * agent will hold a guest to at the gate. Deriving a different figure from
 * bedroom count and showing that instead was a straightforward lie about
 * somebody else's property, and it also hid four-guest flats from a search for
 * four guests whenever the host had put them in two bedrooms.
 *
 * Where no number is declared, capacity falls back to two
 * guests per bedroom, the convention every lodging site uses when a host has
 * not said. A listing with neither a declared capacity nor a bedroom is not a
 * small place, it is a place where bedrooms are the wrong unit (a restaurant
 * table, a day trip), so it reports no capacity and a party size never rules
 * it out.
 */
export function sleeps(facts: ListingFacts): number | null {
  if (facts.maxGuests !== undefined && facts.maxGuests > 0) return facts.maxGuests;
  return facts.bedrooms > 0 ? facts.bedrooms * 2 : null;
}

/**
 * Only inventory that passed admission carries verification.
 *
 * This used to also have to exclude third-party stock, which could never be
 * verified because there was nobody behind it to verify. There is no
 * third-party stock any more, so the flag on the row is the whole answer.
 */
export function isVerifiedFirstParty(facts: ListingFacts): boolean {
  return facts.verified;
}

/**
 * The structured half of the rule, evaluated against facts alone.
 *
 * Every bound is a minimum except the price ceiling, and every one of them is
 * skipped when it was not asked for, so an empty filter matches everything.
 */
export function matchesFacts(facts: ListingFacts, filter: ListingSearchFilter = {}): boolean {
  // The category, which lives here rather than in `matchesFilter` because the
  // drawer counts against facts alone and it is the drawer that now asks it.
  if (filter.kind && facts.kind !== filter.kind) return false;

  // Rent and sale are two markets, and a 180m asking price landing in a rent
  // search is the single most confusing thing this catalogue could do. Absent
  // reads as "rent" because that is what every row without the column is.
  if (filter.intent && (facts.intent ?? "rent") !== filter.intent) return false;

  const wantsBudget = filter.minPriceMinor !== undefined || filter.maxPriceMinor !== undefined;
  if (wantsBudget) {
    // A price of zero is "we were not given an amount", not "free".
    if (facts.priceMinor <= 0) return false;
    if (filter.minPriceMinor !== undefined && facts.priceMinor < filter.minPriceMinor) return false;
    if (filter.maxPriceMinor !== undefined && facts.priceMinor > filter.maxPriceMinor) return false;
  }

  if (filter.bedrooms !== undefined && facts.bedrooms < filter.bedrooms) return false;
  if (filter.bathrooms !== undefined && facts.bathrooms < filter.bathrooms) return false;

  if (filter.guests !== undefined) {
    const capacity = sleeps(facts);
    if (capacity !== null && capacity < filter.guests) return false;
  }

  if (filter.amenities && filter.amenities.length > 0) {
    const has = new Set(facts.amenities);
    for (const code of filter.amenities) {
      if (!has.has(code)) return false;
    }
  }

  if (filter.instantBook && !facts.instantBook) return false;
  if (filter.verifiedOnly && !isVerifiedFirstParty(facts)) return false;

  /*
   * The retirement switch.
   *
   * Example listings are in the catalogue because the catalogue is otherwise
   * empty. The day real supply arrives somebody will want them gone, and that
   * should be a flag rather than a migration, because the decision is likely to
   * be reversed once or twice while supply is thin in one city and healthy in
   * another.
   *
   * Note it is one-directional on purpose. There is a filter for "hide the
   * examples" and deliberately none for "show me only the examples": the second
   * would be a discovery surface whose entire content is properties that do not
   * exist, which is the shape this whole exercise exists to prevent.
   */
  if (filter.excludeDemo && facts.isDemo) return false;

  if (filter.powerBackup && !hasBackupPower(facts)) return false;
  if (filter.powerBandA && facts.utilities?.powerGrid !== "BAND_A") return false;

  if (filter.waterSupply && filter.waterSupply.length > 0) {
    // OR, not AND: one column, one value. See the note on the filter type.
    const source = facts.utilities?.waterSupply;
    if (source === undefined) return false;
    if (!filter.waterSupply.includes(source)) return false;
  }

  return true;
}

/**
 * The one filter rule: free text must appear somewhere in the haystack, and
 * every structured bound must hold. The category is one of those bounds and is
 * judged by `matchesFacts` below, not here: a listing IS a facts object, and a
 * second copy of the category test up here would be a rule that could drift
 * from the one the browser runs.
 */
export function matchesFilter(l: Listing, filter: ListingSearchFilter = {}): boolean {
  const q = filter.q?.trim().toLowerCase();
  if (q && !haystack(l).includes(q)) return false;
  return matchesFacts(l, filter);
}

/**
 * Highest rated first, but never two of the same category in a row while an
 * alternative exists, so the rail reads as a tour of the catalogue.
 */
export function diversePick(listings: Listing[], limit: number): Listing[] {
  const pool = [...listings].sort(
    (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
  );
  const out: Listing[] = [];
  while (out.length < limit && pool.length > 0) {
    const prev: ListingKind | undefined = out[out.length - 1]?.kind;
    const idx = pool.findIndex((l) => l.kind !== prev);
    const pick = pool.splice(idx === -1 ? 0 : idx, 1)[0];
    if (!pick) break;
    out.push(pick);
  }
  return out;
}
