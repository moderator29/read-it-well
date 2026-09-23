/**
 * THE PRODUCT'S OWN SHAPE, in English: the wall that names what you asked
 * for, the age of a listing, the facts of a compound, and the other small
 * words that come with deleting a second shelf.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ITS OWN FILE. The same reason `price-check.en.ts` gives: `en.ts`
 * is written by several workers in the same hour, and a namespace kept in a
 * module costs that file one import and one line. Other locales inherit these
 * through `withFallback`, and declaring the English text in `yo.ts`, `ha.ts`
 * or `ig.ts` would be the coverage lie `locale-completeness.ts` refuses. An
 * untranslated key is a copy gap for a speaker to close.
 *
 * British spelling, no dashes as punctuation, and nothing here asserts
 * anything the code cannot show.
 */
export const shapeEn = {
  /** V-18: the account choice for somebody stopped on the way somewhere. */
  wall: {
    create: "Create an account",
    signIn: "Sign in",
    searchPlace: "to see homes in {place}",
    searchQuoted: "to see results for “{term}”",
    searchAny: "to see what is listed",
    listing: "to open this listing",
    stay: "to open this stay",
    other: "to open that page",
    body: "Everything inside Vallo is for members. New accounts are free.",
  },
  /** V-22: how old a listing is, on the card and the page. */
  listed: {
    today: "Listed today",
    yesterday: "Listed yesterday",
    days: "Listed {n} days ago",
    stale: "Listed in {month}, not confirmed since",
    basis: "Newest first, by the day each listing went live.",
    newMark: "New",
    newMarkLabel: "New since your last visit",
  },
  /** V-26: the card's own words that moved from the deleted `/rent` shelf. */
  card: {
    messageAgent: "Message agent",
  },
  /** V-26: the shelf's market chip when the rent market is chosen. */
  market: {
    rent: "Rent",
  },
};
