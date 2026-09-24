import { publicAreaName, publicCityName } from "../share/public-text";

/**
 * Rule 10 for the after-the-gate surfaces a third party can read (the /r
 * receipt check, the complaint pack, the demand letter): a place is printed
 * only through the closed lists. The neighbourhood when the whole of it is on
 * the list for its state, otherwise the listed city, otherwise the state name
 * from the states table, which nobody typed, otherwise `country`. Never the
 * lister's spelling.
 */
export function placeFrom(
  area: string | null | undefined,
  city: string | null | undefined,
  stateCode: string | null | undefined,
  stateName: string | null,
  country: string,
): string {
  const local = publicAreaName(area, stateCode) ?? publicCityName(city, stateCode);
  if (local === null) return stateName ?? country;
  if (!stateName || local.toLowerCase() === stateName.toLowerCase()) return local;
  return `${local}, ${stateName}`;
}

/**
 * A person's name as a third party may read it: the first word and the
 * initial of the last, "Adaeze O.". A single word stays as it is; nothing
 * typed, or only symbols, gives null so the caller says "the lister".
 */
export function firstNameAndInitial(name: string | null | undefined): string | null {
  const words = (name ?? "").trim().split(/\s+/).filter((word) => /\p{L}/u.test(word));
  if (words.length === 0) return null;
  const first = (words[0] as string).slice(0, 40);
  if (words.length === 1) return first;
  const initial = Array.from((words[words.length - 1] as string).replace(/[^\p{L}]/gu, ""))[0];
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}
