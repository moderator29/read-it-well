import { exactNeighbourhood } from "../places/neighbourhoods";

/**
 * RULE 10, BY CONSTRUCTION: NO TEXT A LISTER TYPED EVER REACHES A PUBLIC
 * SURFACE.
 *
 * The first version of this file was a filter: it read a title or an area a
 * lister typed and refused the ones that looked like an address. Review
 * showed a filter cannot be made provable against free text ("14 Admiralty",
 * "Nº 5 Bourdillon", "number five Bourdillon", a Cyrillic "а" in "Wаy",
 * "Carlton Gate" all pass one), so the rule is now a construction, not a test:
 *
 *   - A TITLE IS NEVER PRINTED. Every public card composes its heading from
 *     facts the card already shows (`doorTitle`: "2 bedroom flat in Yaba";
 *     a stay: "A stay in Ikoyi").
 *   - AN AREA IS PRINTED ONLY WHEN THE WHOLE OF IT IS A NAME ON THE CLOSED
 *     NEIGHBOURHOODS LIST (`lib/places/neighbourhoods.ts`), in the listing's
 *     own state, and then in the list's spelling, not the lister's.
 *   - Otherwise the STATE, which comes from the states table and was never
 *     typed. Never a city: a city is text a lister typed too.
 *
 * The same list lives in SQL (`private.public_neighbourhood`, migration
 * 20260924121300), so the database hands a public surface nothing else, and a
 * test holds the two lists equal. Two
 * walls, one list. The share door, its image, the Status image, the TO LET
 * board, the area pages and the demand board all read places through here.
 */

/** A neighbourhood fit for a public surface, in the list's spelling, or null. */
export function publicAreaName(area: string | null | undefined, stateCode?: string | null): string | null {
  return exactNeighbourhood(area, stateCode)?.area ?? null;
}
