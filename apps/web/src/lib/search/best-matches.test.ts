import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { bestMatches, reasonFor, reasonText, type MatchSignals } from "./best-matches";
import { savedSearchSignal } from "./saved-search-signal";

/**
 * Best matches come from real signals only, and the reason line names the
 * signal. No listing is a "match" without one, an example never is, and
 * nothing here is a score.
 */
function home(over: Partial<Listing> & Pick<Listing, "id">): Listing {
  return {
    slug: over.id,
    title: "A home",
    kind: "rental",
    intent: "rent",
    pricePeriod: "year",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 2_000_000_00,
    moveInCostMinor: 3_000_000_00,
    moveInCostStated: true,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 2,
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

const NONE: MatchSignals = { savedSearches: [], savedHomes: [], interests: [], recentPlaces: [] };
const t = getDictionary("en");
const kindName = (kind: Listing["kind"]) => t.experienceLabels.kinds[kind].one;

describe("best matches: a reason or nothing", () => {
  it("draws nothing at all when the person has given no signal", () => {
    const shelf = [home({ id: "a" }), home({ id: "b", area: "Lekki Phase 1" })];
    expect(bestMatches(shelf, NONE)).toEqual([]);
  });

  it("a saved search with a place and a budget reads 'In {area}, under your budget'", () => {
    const signals = { ...NONE, savedSearches: [savedSearchSignal({ q: "Yaba", max: "4000000", market: "rent" })] };
    const reason = reasonFor(home({ id: "a" }), signals);
    expect(reason).toEqual({ key: "areaBudget", area: "Yaba" });
    expect(reasonText(reason!, t.searchV2.reasons, kindName)).toBe("In Yaba, under your budget");
  });

  it("a home the saved search would not return is not matched by it", () => {
    const signals = { ...NONE, savedSearches: [savedSearchSignal({ q: "Yaba", max: "4000000", market: "rent" })] };
    /* Over the budget: the cash at the door is 5m against a 4m ceiling. */
    expect(reasonFor(home({ id: "a", moveInCostMinor: 5_000_000_00 }), signals)).toBeNull();
    /* Another place. */
    expect(reasonFor(home({ id: "b", area: "Ikoyi" }), signals)).toBeNull();
  });

  it("a saved search with a place and no budget says so without a budget", () => {
    const signals = { ...NONE, savedSearches: [savedSearchSignal({ q: "Yaba" })] };
    const reason = reasonFor(home({ id: "a" }), signals)!;
    expect(reasonText(reason, t.searchV2.reasons, kindName)).toBe("In Yaba, like your saved search");
  });

  it("a saved home names its area, and the saved home itself is never offered", () => {
    const signals = { ...NONE, savedHomes: [{ id: "saved", area: "Lekki Phase 1", city: "Lagos" }] };
    const shelf = [home({ id: "saved", area: "Lekki Phase 1" }), home({ id: "near", area: "Lekki Phase 1" })];
    const found = bestMatches(shelf, signals);
    expect(found.map((m) => m.listing.id)).toEqual(["near"]);
    expect(reasonText(found[0]!.reason, t.searchV2.reasons, kindName)).toBe("In Lekki Phase 1, near a home you saved");
  });

  it("a place opened on this device names its area, and the opened home is never offered", () => {
    const signals = { ...NONE, recentPlaces: [{ id: "seen", place: "Yaba, Lagos" }] };
    const found = bestMatches([home({ id: "seen" }), home({ id: "other" })], signals);
    expect(found.map((m) => m.listing.id)).toEqual(["other"]);
    expect(reasonText(found[0]!.reason, t.searchV2.reasons, kindName)).toBe("In Yaba, where you have been looking");
  });

  it("what they came for names the kind", () => {
    const found = bestMatches([home({ id: "a", kind: "apartment" })], { ...NONE, interests: ["apartment"] });
    expect(reasonText(found[0]!.reason, t.searchV2.reasons, kindName)).toBe("Apartment, what you came for");
  });

  it("an example listing is never a match, whatever the signals say", () => {
    const signals = { ...NONE, interests: ["rental"], savedSearches: [savedSearchSignal({ q: "Yaba" })] };
    expect(bestMatches([home({ id: "x", isDemo: true })], signals)).toEqual([]);
  });

  it("orders the strongest reason first and keeps the shelf's order within one", () => {
    const signals: MatchSignals = {
      ...NONE,
      interests: ["rental"],
      savedSearches: [savedSearchSignal({ q: "Ikoyi" })],
    };
    const shelf = [home({ id: "k1" }), home({ id: "s1", area: "Ikoyi" }), home({ id: "k2" })];
    expect(bestMatches(shelf, signals).map((m) => [m.listing.id, m.reason.key])).toEqual([
      ["s1", "areaSaved"],
      ["k1", "kind"],
      ["k2", "kind"],
    ]);
  });

  it("no reason line carries a percentage or a score", () => {
    for (const line of Object.values(t.searchV2.reasons)) expect(line).not.toMatch(/%|score|\d/);
  });
});
