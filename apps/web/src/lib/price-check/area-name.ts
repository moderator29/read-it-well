/**
 * WHAT MAY BE PRINTED WHERE A NEIGHBOURHOOD NAME GOES, AND WHY THERE ARE TWO
 * GUARDS AND NOT ONE.
 *
 * ---------------------------------------------------------------------------
 * THE RULE IS ABSOLUTE: no share artefact ever carries a specific address, for
 * anybody. The walls that keep it are in the database, and they are real:
 * `price_check_share_scope` has no label for a property, `price_check_shares`
 * has no address, latitude, longitude or listing id column, the write is
 * reachable only through a definer function whose signature has no parameter
 * for one, and `price_check_shares_area_is_not_an_address` refuses an `area`
 * string shaped like a street address.
 *
 * ---------------------------------------------------------------------------
 * AND A CHECK CONSTRAINT IS A GUARD ON THE WRITE, WHICH IS THE HALF A GUARD OF
 * THIS SHAPE ALWAYS MISSES.
 *
 * A row is tested once, on the way in, against whatever the constraint said
 * THAT DAY. Nothing re-tests it afterwards. That is not hypothetical here: the
 * address guard on this very column has already been rewritten once, by
 * `20260922223118_the_address_guard_on_a_share_card_refused_a_neighbourhood`,
 * because its first version refused "1004 Estate". The rewrite LOOSENED it,
 * and a row minted under a loose constraint renders exactly as happily as one
 * minted under a tight one, because the renderer never asks.
 *
 * So the renderer asks. `safeAreaName` is applied by `shareLines`, which is
 * the one function that turns a stored row into the words on a card, on the
 * page, in the page title, in the Open Graph description and on the Open Graph
 * image. A row whose `area` reads like an address prints the STATE instead.
 * A state-wide card is a real and honest artefact, so the fallback costs a
 * reader nothing and is never a blank.
 *
 * `looksLikeAnAddress` deliberately MIRRORS the live constraint rather than
 * inventing a third rule, so the read side and the write side cannot disagree
 * about what an address looks like. It is a second reading of the same rule at
 * a different moment, which is the whole point of it.
 *
 * The free-text route itself is closed on the write side by
 * `shareAreaPrices`, which will not mint a card for an area name this platform
 * does not already hold real published listings in. This module is what covers
 * a row that is ALREADY STORED, or one stored under a constraint somebody
 * loosens next.
 */

/**
 * A leading house number, with or without "No.". "No. 14 Bourdillon".
 * Mirrors the first half of `price_check_shares_area_is_not_an_address`.
 */
const LEADING_HOUSE_NUMBER = /^(no\.?|number)\s*[0-9]/i;

/**
 * A number followed, later in the string, by a word that only ever names a
 * street. "14 Bourdillon Road", "Flat 3, 27 Glover Court".
 *
 * Mirrors the second half of the live constraint. It is narrow on purpose and
 * the narrowness is a decision, not an oversight: the first version of this
 * rule refused "1004 Estate" and "Phase 2", which are neighbourhoods whose
 * names contain digits, and refusing a real neighbourhood is its own kind of
 * dishonesty. `\y` in Postgres is `\b` here.
 */
const NUMBER_THEN_STREET_WORD =
  /(^|[\s,])[0-9]+[a-z]?[\s,/-]+.*\b(road|street|close|crescent|avenue|drive|lane|way|boulevard|court|terrace)\b/i;

/** True when this string has the shape of a street address rather than a place. */
export function looksLikeAnAddress(area: string | null | undefined): boolean {
  if (area === null || area === undefined) return false;
  const trimmed = area.trim();
  if (trimmed === "") return false;
  return LEADING_HOUSE_NUMBER.test(trimmed) || NUMBER_THEN_STREET_WORD.test(trimmed);
}

/**
 * The neighbourhood name a card may print, or null when there is none it may.
 *
 * Null for an empty string as well as for an address, so a caller's `?? state`
 * fallback covers both and no card ever prints a naira range under a blank
 * heading.
 */
export function safeAreaName(area: string | null | undefined): string | null {
  if (area === null || area === undefined) return null;
  const trimmed = area.trim();
  if (trimmed === "") return null;
  if (looksLikeAnAddress(trimmed)) return null;
  return trimmed;
}

/**
 * Does this name match one of the neighbourhood names we actually hold?
 *
 * Case and surrounding whitespace are ignored, because `listings.area` is free
 * text an agent typed and "lekki phase 1" and "Lekki Phase 1" are the same
 * neighbourhood. Nothing else is: a substring match here would admit
 * "14 Bourdillon, Ikoyi" on the strength of "Ikoyi", which is the exact thing
 * the vocabulary check exists to refuse.
 */
export function isHeldAreaName(candidate: string, held: readonly string[]): boolean {
  const want = candidate.trim().toLowerCase();
  if (want === "") return false;
  return held.some((name) => name.trim().toLowerCase() === want);
}
