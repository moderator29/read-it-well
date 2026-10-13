import type { Listing, ListingKind, ListingSearchFilter } from "@/lib/listings/types";
import { budgetFigure, factsOf, matchesFilter } from "@/lib/listings/filter";

/**
 * BEST MATCHES, FROM WHAT THE PERSON ACTUALLY TOLD US.
 *
 * The reference this section copies prints "94% match" on every card. Vallo
 * prints no score, because there is no model behind one and a number with
 * nothing behind it is an invented fact. What it prints instead is the
 * reason, and the reason is always one of four signals the person gave:
 *
 *   a saved search      the listing passes that search's own filter, the same
 *                       `matchesFilter` the shelf and the alerts run, so a
 *                       "like your saved search" line cannot disagree with
 *                       what that search returns when it is opened
 *   a saved home        the listing sits in the same area as a home on their
 *                       shortlist (never that home itself)
 *   a place they opened the listing sits in the area of a listing they opened
 *                       on this device (`lib/search/memory.ts`, read in the
 *                       browser only; the server never sees it)
 *   what they came for  the listing's kind is one they chose at onboarding
 *                       (`profiles.interests`)
 *
 * A listing with none of those is not a match and is not shown here, however
 * well it ranks. An example listing is never a match: it illustrates a flat
 * that does not exist. A home already saved or already opened is left out,
 * because recommending somebody the thing they just looked at tells them
 * nothing.
 *
 * Pure and free of server imports, so the server draws the section with the
 * signals it holds and the browser draws it again once the device's own
 * memory is read, from the same function.
 */

export type SavedSearchSignal = {
  /** The saved search's own filter (`shelfFilter(parseShelfQuery(params))`). */
  filter: ListingSearchFilter;
  /** True when the search named a place (words or areas), so the line may say "In {area}". */
  namesPlace: boolean;
  /** The search's budget ceiling in kobo, when it had one. */
  maxMinor?: number;
};

export type MatchSignals = {
  savedSearches: readonly SavedSearchSignal[];
  /** The account's shortlist: id, and where each saved home is. */
  savedHomes: readonly { id: string; area: string; city: string }[];
  /** The kinds the person said they came for. */
  interests: readonly string[];
  /** Places opened on this device, as `memory.ts` keeps them ("Lekki, Lagos"). */
  recentPlaces: readonly { id: string; place: string }[];
};

export type MatchReason =
  | { key: "areaBudget"; area: string }
  | { key: "areaSaved"; area: string }
  | { key: "budget" }
  | { key: "saved" }
  | { key: "nearSaved"; area: string }
  | { key: "recent"; area: string }
  | { key: "kind"; kind: ListingKind };

export type BestMatch = { listing: Listing; reason: MatchReason };

/** Strongest first: a search the person saved outranks everything inferred. */
const RANK: Record<MatchReason["key"], number> = {
  areaBudget: 0,
  areaSaved: 1,
  budget: 2,
  saved: 3,
  nearSaved: 4,
  recent: 5,
  kind: 6,
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** "Lekki, Lagos" is the area Lekki; a bare "Lagos" names no area. */
function areaOfPlace(place: string): string | null {
  const parts = place.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[0]! : null;
}

function fromSavedSearch(listing: Listing, search: SavedSearchSignal): MatchReason | null {
  if (!matchesFilter(listing, search.filter)) return null;
  const area = listing.area.trim();
  const figure = budgetFigure(factsOf(listing), search.filter);
  const underBudget = search.maxMinor !== undefined && figure !== null && figure <= search.maxMinor;
  if (search.namesPlace && area) return underBudget ? { key: "areaBudget", area } : { key: "areaSaved", area };
  return underBudget ? { key: "budget" } : { key: "saved" };
}

/** The one reason this listing is a match, the strongest it has, or null. */
export function reasonFor(listing: Listing, signals: MatchSignals): MatchReason | null {
  if (listing.isDemo) return null;
  let best: MatchReason | null = null;
  const consider = (next: MatchReason | null) => {
    if (next && (!best || RANK[next.key] < RANK[best.key])) best = next;
  };
  for (const search of signals.savedSearches) consider(fromSavedSearch(listing, search));
  const area = listing.area.trim();
  if (area) {
    if (signals.savedHomes.some((home) => home.id !== listing.id && same(home.area, area) && same(home.city, listing.city))) {
      consider({ key: "nearSaved", area });
    }
    if (signals.recentPlaces.some((seen) => seen.id !== listing.id && same(areaOfPlace(seen.place) ?? "", area))) {
      consider({ key: "recent", area });
    }
  }
  if (signals.interests.includes(listing.kind)) consider({ key: "kind", kind: listing.kind });
  return best;
}

/**
 * The section's cards: listings with a real reason, strongest reason first and
 * the shelf's own order within a reason, never a saved or an opened home.
 */
export function bestMatches(candidates: readonly Listing[], signals: MatchSignals, limit = 8): BestMatch[] {
  const skip = new Set<string>([
    ...signals.savedHomes.map((home) => home.id),
    ...signals.recentPlaces.map((seen) => seen.id),
  ]);
  const found: (BestMatch & { at: number })[] = [];
  candidates.forEach((listing, at) => {
    if (skip.has(listing.id)) return;
    const reason = reasonFor(listing, signals);
    if (reason) found.push({ listing, reason, at });
  });
  found.sort((a, b) => RANK[a.reason.key] - RANK[b.reason.key] || a.at - b.at);
  return found.slice(0, limit).map(({ listing, reason }) => ({ listing, reason }));
}

export type ReasonCopy = {
  areaBudget: string;
  areaSaved: string;
  budget: string;
  saved: string;
  nearSaved: string;
  recent: string;
  kind: string;
};

/** The line under the card, in the reader's words. `kindName` is the kind's noun. */
export function reasonText(reason: MatchReason, copy: ReasonCopy, kindName: (kind: ListingKind) => string): string {
  switch (reason.key) {
    case "areaBudget":
    case "areaSaved":
    case "nearSaved":
    case "recent":
      return copy[reason.key].replace("{area}", reason.area);
    case "kind": {
      const noun = kindName(reason.kind);
      const lead = noun.length > 0 ? noun[0]!.toLocaleUpperCase() + noun.slice(1) : noun;
      return copy.kind.replace("{kind}", lead);
    }
    default:
      return copy[reason.key];
  }
}
