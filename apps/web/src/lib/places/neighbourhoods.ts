/**
 * THE NEIGHBOURHOODS VALLO RECOGNISES IN TYPED TEXT, AND THE STATE EACH IS IN.
 *
 * A closed list, deliberately. Two features turn free text into a place: the
 * pasted broadcast (V-09), which fills a draft's area, and the demand board
 * (V-10), which counts searches by neighbourhood. Both must never guess: a
 * guessed state is a listing filed in the wrong city, and a guessed area is a
 * demand count about a place nobody asked for. A name not on this list is
 * left alone. Longest names first, so "Lekki Phase 1" wins over "Lekki".
 */

export type Neighbourhood = { area: string; city: string; stateCode: string };

/**
 * Neighbourhoods a broadcast may name, and the state and city each is in.
 * Closed on purpose: an area not on this list is left for the agent to type,
 * because a guessed state is a listing filed in the wrong city. Longest names
 * first so "Lekki Phase 1" wins over "Lekki" and "Ikeja GRA" over "Ikeja".
 */
export const NEIGHBOURHOODS: readonly Neighbourhood[] = (
  [
    ["Lekki Phase 1", "Lagos", "LA"],
    ["Lekki Phase 2", "Lagos", "LA"],
    ["Ikeja GRA", "Lagos", "LA"],
    ["Victoria Island", "Lagos", "LA"],
    ["Old Ikoyi", "Lagos", "LA"],
    ["Ikoyi", "Lagos", "LA"],
    ["Lekki", "Lagos", "LA"],
    ["Ajah", "Lagos", "LA"],
    ["Sangotedo", "Lagos", "LA"],
    ["Osapa London", "Lagos", "LA"],
    ["Osapa", "Lagos", "LA"],
    ["Agungi", "Lagos", "LA"],
    ["Ikota", "Lagos", "LA"],
    ["Oniru", "Lagos", "LA"],
    ["Yaba", "Lagos", "LA"],
    ["Surulere", "Lagos", "LA"],
    ["Ikeja", "Lagos", "LA"],
    ["Maryland", "Lagos", "LA"],
    ["Gbagada", "Lagos", "LA"],
    ["Magodo", "Lagos", "LA"],
    ["Ogudu", "Lagos", "LA"],
    ["Ojodu", "Lagos", "LA"],
    ["Omole", "Lagos", "LA"],
    ["Ilupeju", "Lagos", "LA"],
    ["Anthony", "Lagos", "LA"],
    ["Ogba", "Lagos", "LA"],
    ["Agege", "Lagos", "LA"],
    ["Festac", "Lagos", "LA"],
    ["Ikorodu", "Lagos", "LA"],
    ["Ketu", "Lagos", "LA"],
    ["Ojota", "Lagos", "LA"],
    ["Wuse 2", "Abuja", "FC"],
    ["Wuse", "Abuja", "FC"],
    ["Maitama", "Abuja", "FC"],
    ["Asokoro", "Abuja", "FC"],
    ["Garki", "Abuja", "FC"],
    ["Gwarinpa", "Abuja", "FC"],
    ["Jabi", "Abuja", "FC"],
    ["Utako", "Abuja", "FC"],
    ["Kubwa", "Abuja", "FC"],
    ["Lugbe", "Abuja", "FC"],
    ["Life Camp", "Abuja", "FC"],
    ["Katampe", "Abuja", "FC"],
    ["Guzape", "Abuja", "FC"],
    ["Apo", "Abuja", "FC"],
    ["Lokogoma", "Abuja", "FC"],
    ["Jahi", "Abuja", "FC"],
    ["Kado", "Abuja", "FC"],
    ["Galadimawa", "Abuja", "FC"],
  ] as const
)
  .map(([area, city, stateCode]) => ({ area, city, stateCode }))
  .sort((a, b) => b.area.length - a.area.length);

/** "VI" is how half of Lagos writes Victoria Island. */
/* Estates (Banana Island, Parkview) are not on the list and have no alias: a
   named estate is nearly an address, and the reviewer's rule-10 cases expect
   them to print nothing. */
export const PLACE_ALIASES: Readonly<Record<string, string>> = {
  vi: "Victoria Island",
  "v.i": "Victoria Island",
  "lekki phase one": "Lekki Phase 1",
  "lekki ph 1": "Lekki Phase 1",
  "wuse ii": "Wuse 2",
};

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findNeighbourhood(text: string): Neighbourhood | null {
  const lower = text.toLowerCase();
  for (const [alias, name] of Object.entries(PLACE_ALIASES)) {
    if (new RegExp(`(^|[^a-z])${escapeRe(alias)}([^a-z]|$)`).test(lower)) {
      return NEIGHBOURHOODS.find((p) => p.area === name) ?? null;
    }
  }
  for (const place of NEIGHBOURHOODS) {
    if (new RegExp(`(^|[^a-z])${escapeRe(place.area.toLowerCase())}([^a-z0-9]|$)`).test(lower)) {
      return place;
    }
  }
  return null;
}


/**
 * The one normal form every exact comparison below uses: compatibility
 * normalised (so full-width letters fold), trimmed, single-spaced, lower
 * case. A lookalike letter from another alphabet does not fold and so does
 * not match, which is the point: the list admits names, not near misses.
 */
export function placeKey(text: string): string {
  return text.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The canonical neighbourhood when the WHOLE text is a name on the closed
 * list (or one of its aliases), in the given state when one is given. Not a
 * search: "Ikota Villa" is not "Ikota", and "Yaba, 14 Herbert Macaulay" is
 * not "Yaba". Used by every public surface (rule 10).
 */
export function exactNeighbourhood(text: string | null | undefined, stateCode?: string | null): Neighbourhood | null {
  if (typeof text !== "string") return null;
  const key = placeKey(text);
  if (key === "") return null;
  const name = PLACE_ALIASES[key] ?? null;
  const place = NEIGHBOURHOODS.find((p) => p.area.toLowerCase() === (name ?? key).toLowerCase()) ?? null;
  if (!place) return null;
  if (stateCode && place.stateCode !== stateCode.toUpperCase()) return null;
  return place;
}
