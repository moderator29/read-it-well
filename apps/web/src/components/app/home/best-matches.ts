import type { Listing } from "@/lib/listings/types";

/**
 * BEST MATCHES, DECIDED FROM THE PERSON'S OWN SIGNALS AND NOTHING ELSE.
 *
 * A row on Home that says why each place is there. The reason is one of three
 * real facts, and a place with none of them is not a best match:
 *
 *   search    the place came back from one of the person's SAVED SEARCHES
 *   interest  its kind is one the person said they came for at onboarding
 *             (`profiles.interests`)
 *   saved     it is in the same area as a place the person SAVED
 *
 * Never a percentage, never a score, never "AI". A made-up "94 per cent
 * match" is a number nothing computed, and the product rule is that a figure
 * on a surface is one the database produced. The order is the order the page
 * already ranked the pool in (the published Recommended formula, the stated
 * kinds first), and this module only keeps what has a reason and takes the
 * first of the reasons in the order above.
 *
 * Places already on the person's shortlist are left out (they know about
 * them), and places drawn higher on the same screen are moved behind the
 * others rather than dropped, so a small catalogue still fills the row.
 *
 * "Viewed" is not a signal here: what a phone has opened is kept on the phone
 * (`lib/search/memory.ts`) and the server never sees it, so a server-built row
 * cannot honestly claim it.
 *
 * Pure: no React, no storage, no clock. Tested.
 */
export type MatchReason =
  | { kind: "search"; label: string }
  | { kind: "interest"; type: string }
  | { kind: "saved"; area: string };

export type BestMatch = { listing: Listing; reason: MatchReason };

export type BestMatchInput = {
  /** Candidate places, best first. Property market only; the caller decides. */
  pool: readonly Listing[];
  /** What the person said they came for (`profiles.interests`). */
  interests: readonly string[];
  /** Each saved search, with the places the catalogue returned for it. */
  searches: readonly { label: string; listings: readonly Listing[] }[];
  /** The places on the person's shortlist. */
  saved: readonly Listing[];
  /** Ids already drawn higher on the screen: ranked after the others. */
  onScreen?: ReadonlySet<string>;
  limit?: number;
};

export const BEST_MATCH_LIMIT = 8;

const norm = (value: string | undefined) => (value ?? "").trim().toLowerCase();

/** The area a place names for itself, or "" when it only names its city. */
function areaOf(listing: Pick<Listing, "area" | "city">): string {
  const area = norm(listing.area);
  return area !== "" && area !== norm(listing.city) ? area : "";
}

/** Whether the person has said or kept anything a match could come from. */
export function hasSignals(input: Pick<BestMatchInput, "interests" | "searches" | "saved">): boolean {
  return input.interests.length > 0 || input.searches.length > 0 || input.saved.length > 0;
}

export function pickBestMatches(input: BestMatchInput): BestMatch[] {
  const limit = input.limit ?? BEST_MATCH_LIMIT;
  const savedIds = new Set(input.saved.map((listing) => listing.id));
  const interests = new Set(input.interests);

  /* The first saved search that returned a place names it. */
  const searchOf = new Map<string, string>();
  for (const search of input.searches) {
    for (const listing of search.listings) {
      if (!searchOf.has(listing.id)) searchOf.set(listing.id, search.label);
    }
  }

  /* One real name per saved area, as the person's own listing spelled it. */
  const savedAreas = new Map<string, string>();
  for (const listing of input.saved) {
    const key = areaOf(listing);
    if (key !== "" && !savedAreas.has(key)) savedAreas.set(key, listing.area);
  }

  /* The pool first, then any place only a saved search returned. */
  const seen = new Set<string>();
  const candidates: Listing[] = [];
  const add = (listing: Listing) => {
    if (seen.has(listing.id)) return;
    seen.add(listing.id);
    candidates.push(listing);
  };
  for (const listing of input.pool) add(listing);
  for (const search of input.searches) for (const listing of search.listings) add(listing);

  const matches: BestMatch[] = [];
  for (const listing of candidates) {
    if (savedIds.has(listing.id)) continue;
    const label = searchOf.get(listing.id);
    if (label !== undefined) {
      matches.push({ listing, reason: { kind: "search", label } });
    } else if (interests.has(listing.kind)) {
      matches.push({ listing, reason: { kind: "interest", type: listing.kind } });
    } else {
      const area = savedAreas.get(areaOf(listing));
      if (area !== undefined) matches.push({ listing, reason: { kind: "saved", area } });
    }
  }

  const onScreen = input.onScreen;
  if (!onScreen || onScreen.size === 0) return matches.slice(0, limit);
  const fresh = matches.filter((match) => !onScreen.has(match.listing.id));
  const repeats = matches.filter((match) => onScreen.has(match.listing.id));
  return [...fresh, ...repeats].slice(0, limit);
}

/**
 * The reason as a sentence, from the dictionary's three templates. A saved
 * search's label is the person's own words (or the sentence the search was
 * described with); the card's CSS clamps a long one to two lines.
 */
export function reasonText(
  reason: MatchReason,
  copy: { reasonSearch: string; reasonInterest: string; reasonSaved: string },
  kindLabels: Readonly<Record<string, string>>,
  lower: (value: string) => string,
): string {
  switch (reason.kind) {
    case "search":
      return copy.reasonSearch.replace("{label}", reason.label);
    case "interest":
      return copy.reasonInterest.replace("{kind}", lower(kindLabels[reason.type] ?? reason.type));
    case "saved":
      return copy.reasonSaved.replace("{area}", reason.area);
  }
}
