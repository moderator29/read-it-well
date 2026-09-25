/**
 * WHAT A PERSON CAN DO NEXT WITH AN ANSWERED PRICE CHECK (track L).
 *
 * The answered result used to end on the figure, a share control and the
 * comparables. It now offers three next steps:
 *
 *   1. See listings in this area: the search shelf, filtered to the same
 *      market, property type and bedrooms, in the same place;
 *   2. Set an alert: the same search kept as a saved search with its alert
 *      on (`lib/saved/searches-actions.ts` `saveSearch`), so new listings that
 *      match are sent to them;
 *   3. Share: the area card, which already existed.
 *
 * This file is the pure half: the search parameters a check turns into, in
 * the discovery URL contract of `lib/listings/search-params.ts`. Client-safe.
 */
export type CheckFacts = {
  intent: "rent" | "sale";
  propertyType: string;
  bedrooms: number | null;
  /** What the reader typed as the area, if anything. */
  area: string | null;
  /** The local government and state names, as fallbacks for the place. */
  lgaName: string | null;
  stateName: string | null;
};

/** The place, as the shelf reads it: an area filter when one was typed, else free text. */
export function listingSearchParams(facts: CheckFacts): Record<string, string> {
  const params: Record<string, string> = {
    market: facts.intent === "sale" ? "buy" : "rent",
    type: facts.propertyType,
  };
  if (facts.bedrooms !== null && facts.bedrooms > 0) params.beds = String(facts.bedrooms);
  const area = (facts.area ?? "").trim();
  if (area) params.area = area.toLowerCase();
  else {
    const place = (facts.lgaName ?? facts.stateName ?? "").trim();
    if (place) params.q = place;
  }
  return params;
}

export function listingSearchHref(facts: CheckFacts): string {
  return `/search?${new URLSearchParams(listingSearchParams(facts)).toString()}`;
}
