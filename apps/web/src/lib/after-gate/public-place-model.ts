import { publicAreaName } from "../share/public-text";

/**
 * Rule 10 for the after-the-gate surfaces a third party can read (the /r
 * receipt check, the complaint pack, the demand letter): a place is printed
 * only through the closed lists. The neighbourhood when the whole of it is on
 * the list for its state, otherwise the state name from the states table,
 * which nobody typed, otherwise `country`. Never the city, which a lister
 * types (the rule-ten ruling), and never the lister's spelling.
 */
export function placeFrom(
  area: string | null | undefined,
  _city: string | null | undefined,
  stateCode: string | null | undefined,
  stateName: string | null,
  country: string,
): string {
  const local = publicAreaName(area, stateCode);
  if (local === null) return stateName ?? country;
  if (!stateName || local.toLowerCase() === stateName.toLowerCase()) return local;
  return `${local}, ${stateName}`;
}

/**
 * A person's name as a third party may read it: the first word and the
 * initial of the last, "Adaeze O.". A word with a digit, @, slash, colon or
 * dot is dropped whole; of the rest only letters, apostrophes and hyphens
 * survive, and the first word is capped at 20, so a phone number, an email
 * or a link typed as a name never prints. Nothing left gives null, and the
 * caller says "the lister".
 */
export function firstNameAndInitial(name: string | null | undefined): string | null {
  const clean = (word: string) => word.replace(/[^\p{L}'-]/gu, "").replace(/^['-]+|['-]+$/g, "");
  const words = (name ?? "")
    .trim()
    .split(/\s+/)
    // A word carrying a digit, @, a slash, a colon or a dot is a number, an
    // email or a link, not a name: it goes whole, not just its symbols.
    .filter((word) => !/[\p{N}@/:.\\_]/u.test(word))
    .map(clean)
    .filter((word) => /\p{L}/u.test(word));
  if (words.length === 0) return null;
  const first = Array.from(words[0] as string).slice(0, 20).join("");
  if (words.length === 1) return first;
  const initial = Array.from(words[words.length - 1] as string).find((ch) => /\p{L}/u.test(ch));
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}
