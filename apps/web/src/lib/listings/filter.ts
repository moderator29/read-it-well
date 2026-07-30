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
 * Partner stock is held to the same rule: the partner decorator in
 * `repository.ts` runs every provider result through `matchesFilter` before it
 * is appended, so a hotel feed cannot ignore a price ceiling, an amenity or a
 * verified-only request just because it arrived from somewhere else.
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
  amenities: string[];
  instantBook: boolean;
  verified: boolean;
  source?: "rentme" | "partner";
};

/** Just the facts, for shipping a candidate set to the drawer. */
export function factsOf(l: Listing): ListingFacts {
  return {
    priceMinor: l.priceMinor,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    amenities: l.amenities,
    instantBook: l.instantBook,
    verified: l.verified,
    source: l.source,
  };
}

/**
 * How many people a place takes, or null when that is not a knowable thing
 * about it.
 *
 * The catalogue has no sleeps column, so capacity is derived: two guests per
 * bedroom, the convention every lodging site uses when a host has not stated a
 * number. A listing with no bedrooms is not a small place, it is a place where
 * bedrooms are the wrong unit (a restaurant table, a day trip), so it reports
 * no capacity and a party size never rules it out.
 */
export function sleeps(facts: ListingFacts): number | null {
  return facts.bedrooms > 0 ? facts.bedrooms * 2 : null;
}

/**
 * The bedroom count a party of `guests` implies, for pushing the same rule
 * into SQL. The inverse of `sleeps`, rounded up so four guests need two
 * bedrooms rather than one and a half.
 */
export function bedroomsForGuests(guests: number): number {
  return Math.ceil(guests / 2);
}

/** Only first-party inventory that passed admission carries verification. */
export function isVerifiedFirstParty(facts: ListingFacts): boolean {
  return facts.verified && facts.source !== "partner";
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
