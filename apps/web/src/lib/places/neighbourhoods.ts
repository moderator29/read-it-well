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
    ["Banana Island", "Lagos", "LA"],
    ["Old Ikoyi", "Lagos", "LA"],
    ["Parkview", "Lagos", "LA"],
    ["Ikoyi", "Lagos", "LA"],
    ["Lekki", "Lagos", "LA"],
    ["Ajah", "Lagos", "LA"],
    ["Sangotedo", "Lagos", "LA"],
    ["Chevron", "Lagos", "LA"],
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
const PLACE_ALIASES: Readonly<Record<string, string>> = {
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

