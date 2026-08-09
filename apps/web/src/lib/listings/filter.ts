import type { Listing, ListingKind, ListingSearchFilter } from "./types";

/**
 * Filter and ranking semantics shared by every listing source.
 *
 * The seed catalogue and the Supabase catalogue must answer the same question
 * the same way, otherwise a blended result set would filter differently
 * depending on which half a listing came from. Both sources import these
 * functions, so there is exactly one definition of "matches this search" and
 * one definition of "a good recommendation rail" in the codebase.
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
  priceMinor: number;
  bedrooms: number;
  bathrooms: number;
  /** The host's declared capacity, where the source carries one. */
  maxGuests?: number;
  amenities: string[];
  instantBook: boolean;
  verified: boolean;
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
    priceMinor: l.priceMinor,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    ...(l.maxGuests !== undefined ? { maxGuests: l.maxGuests } : {}),
    amenities: l.amenities,
    instantBook: l.instantBook,
    verified: l.verified,
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
 * Where no number is declared (the seed catalogue), capacity falls back to two
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
 * The one filter rule: category must match when asked for, free text must
 * appear somewhere in the haystack, and every structured bound must hold.
 */
export function matchesFilter(l: Listing, filter: ListingSearchFilter = {}): boolean {
  if (filter.kind && l.kind !== filter.kind) return false;
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
