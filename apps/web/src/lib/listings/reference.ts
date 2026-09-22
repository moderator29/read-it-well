/**
 * The listing code, and reading one a person typed.
 *
 * A listing carries `VL-` plus six characters from a thirty character
 * alphabet. The database mints it (see
 * `supabase/migrations/20260922110000_c1_a_listing_carries_a_code_a_person_can_read_out.sql`)
 * at the moment the listing is published, and never at draft, because a code
 * is a public handle and a draft has no public existence.
 *
 * THE ALPHABET IS SHORT ON PURPOSE. No `0` or `O`, no `1`, `I` or `L`, no `U`.
 * Those are the characters a person gets wrong reading a code down a Nigerian
 * phone line or writing it on the back of a receipt. `U` goes because it
 * collides with `V` when spoken, and dropping it also empties the space of the
 * commonest accidental rude words.
 *
 * THIS MODULE GUESSES NOTHING. Guessing a code is how somebody lands on the
 * wrong house. `readListingReference` either recognises a code exactly, says
 * the shape was a code but the characters cannot be ours, or says it was not a
 * code at all and the text is an ordinary search.
 */

/** The thirty characters a Vallo code can contain. */
export const LISTING_REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Six body characters, with the `VL` prefix optional because people drop it. */
const SHAPE = /^(?:VL)?([A-Z0-9]{6})$/;

/**
 * What a piece of typed text turned out to be.
 *
 * `impossible` is its own answer rather than folded into `none` so the search
 * page can say WHY nothing matched. "VL-100000" is somebody reading a real
 * code badly, and telling them our codes never contain a one is more useful
 * than searching for the string and finding no houses.
 */
export type ListingReferenceRead =
  | { state: "none" }
  | { state: "code"; value: string }
  | { state: "impossible" };

export function readListingReference(raw: string): ListingReferenceRead {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = SHAPE.exec(cleaned);
  if (!match) return { state: "none" };
  const body = match[1] ?? "";
  for (const character of body) {
    if (!LISTING_REFERENCE_ALPHABET.includes(character)) return { state: "impossible" };
  }
  return { state: "code", value: `VL-${body}` };
}

/**
 * A typed reference, canonicalised, or null when it is not one.
 *
 * The thin door for callers that only need the yes or no. The page that has to
 * explain itself to a reader calls `readListingReference` instead.
 */
export function asListingReference(raw: string): string | null {
  const read = readListingReference(raw);
  return read.state === "code" ? read.value : null;
}

/**
 * Whether a stored value is one of ours.
 *
 * Used where a code arrives from the database rather than from a keyboard, so
 * the prefix is required and the shape is exact.
 */
export function isListingReference(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("VL-") || value.length !== 9) return false;
  for (const character of value.slice(3)) {
    if (!LISTING_REFERENCE_ALPHABET.includes(character)) return false;
  }
  return true;
}
