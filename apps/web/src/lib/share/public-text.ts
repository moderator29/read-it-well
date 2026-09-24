import { looksLikeAnAddress } from "../price-check/area-name";

/**
 * WHAT TEXT A LISTER TYPED MAY APPEAR ON A PUBLIC SURFACE. ONE RULE, SHARED.
 *
 * Rule 10: no share artefact ever carries a specific address, for anybody: no
 * street, house number, pin, coordinates, landmark or estate name. Area and
 * state only. The share door (V-07), its image, the TO LET board (V-08) and
 * the public area pages (V-82) all print text a lister typed (a title, an
 * area), and a lister can type "2 bed flat, 14 Admiralty Way" as a title or
 * "Chevron Drive" as an area. So every one of those surfaces reads that text
 * through THIS file, and the SQL that feeds them applies the same test in
 * `private.public_text_is_safe` (migration 20260924120600), so the database
 * refuses to hand the text over and the code refuses to print it: two walls,
 * one rule.
 *
 * THE TEST FAILS TOWARDS PRINTING LESS. A title that trips it is not shown and
 * the card composes one from facts instead ("2 bedroom flat in Yaba"); an area
 * that trips it falls back to the city, then the state. Over-refusing costs a
 * lister a nicer headline; under-refusing publishes a front door.
 *
 * What it looks for:
 *   - the Price Check address shapes (a leading house number; a number then a
 *     street word), `looksLikeAnAddress`;
 *   - any street or estate word at all ("Admiralty Way", "Chevron Drive",
 *     "Lekki Gardens Estate"), because a named street needs no number to be
 *     walked to;
 *   - a house, plot, block, flat or unit number ("Plot 12", "Block C4", "No 5");
 *   - landmark phrasing ("opposite the Mobil station", "behind", "beside").
 */

const STREET_OR_ESTATE =
  /\b(road|rd|street|str|st\.|close|crescent|cres|avenue|ave|drive|dr\.|lane|ln|way|boulevard|blvd|court|terrace|estate|gardens|garden\s+city|layout|mews|quarters|scheme)\b/i;

const UNIT_NUMBER = /\b(no\.?|number|plot|block|blk|house|flat|apt|apartment|unit|suite|door)\s*[#:.-]?\s*[a-z]?\d/i;

const LANDMARK = /\b(opposite|opp\.?|beside|behind|adjacent|next\s+to|close\s+to|near|off)\b/i;

/** True when a piece of lister text may appear on a public surface. */
export function isPublicSafe(text: string | null | undefined): boolean {
  if (text === null || text === undefined) return false;
  const trimmed = text.trim();
  if (trimmed === "") return false;
  if (looksLikeAnAddress(trimmed)) return false;
  if (STREET_OR_ESTATE.test(trimmed)) return false;
  if (UNIT_NUMBER.test(trimmed)) return false;
  if (LANDMARK.test(trimmed)) return false;
  return true;
}

/** A neighbourhood name fit for a public page or card, or null. */
export function publicAreaName(area: string | null | undefined): string | null {
  if (!isPublicSafe(area)) return null;
  return (area as string).trim();
}

/** A lister's title fit for a public card, or null, when one must be composed. */
export function publicTitle(title: string | null | undefined): string | null {
  if (!isPublicSafe(title)) return null;
  return (title as string).trim().replace(/\s+/g, " ");
}
