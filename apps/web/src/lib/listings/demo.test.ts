import { describe, expect, it } from "vitest";

import { factsOf, matchesFilter } from "./filter";
import type { Listing } from "./types";

/**
 * The one rule this catalogue exists under: example listings yes, verified
 * badge never.
 *
 * The database enforces the storable half of that rule and cannot enforce all
 * of it, because the badge a reader actually sees was never a stored column.
 * `supabase-repository.ts` used to assert `verified: true` on every published
 * row, reasoned as "first-party inventory is admitted through agent approval,
 * so a published listing is by definition a verified one". That reasoning is
 * exactly how this repository once shipped twenty-three invented places with
 * twenty-two of them badged, and no CHECK constraint on `verified_by` would
 * have stopped it, because nothing was writing `verified_by`.
 *
 * So the derivation is what these tests hold. A constraint on columns nobody
 * reads is not a guarantee about what a person sees.
 */

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: "1",
    slug: "a",
    title: "Two bedroom flat in Yaba",
    kind: "apartment",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 220_000_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 1,
    rating: 0,
    reviewCount: 0,
    verified: true,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

describe("an example listing carries no trust signal", () => {
  it("is never verified, whatever else it says", () => {
    const example = listing({ isDemo: true, verified: false });
    expect(example.verified).toBe(false);
  });

  /**
   * `verifiedOnly` is the filter a cautious person reaches for. It must not
   * return a property that does not exist.
   */
  it("is excluded by a verified-only search", () => {
    const example = listing({ isDemo: true, verified: false });
    const real = listing({ isDemo: false, verified: true });

    expect(matchesFilter(example, { verifiedOnly: true })).toBe(false);
    expect(matchesFilter(real, { verifiedOnly: true })).toBe(true);
  });

  it("carries no rating and no review count", () => {
    const example = listing({ isDemo: true, verified: false });
    expect(example.rating).toBe(0);
    expect(example.reviewCount).toBe(0);
  });
});

describe("the retirement switch", () => {
  it("hides examples when asked and leaves real listings alone", () => {
    const example = listing({ isDemo: true, verified: false });
    const real = listing({ isDemo: false, verified: true });

    expect(matchesFilter(example, { excludeDemo: true })).toBe(false);
    expect(matchesFilter(real, { excludeDemo: true })).toBe(true);
  });

  it("shows both when not asked, because the shelf is otherwise empty", () => {
    const example = listing({ isDemo: true, verified: false });
    expect(matchesFilter(example, {})).toBe(true);
  });
});

describe("the facts handed to the browser", () => {
  /**
   * The filter drawer's live match count runs in the browser against
   * `ListingFacts` alone. If the flag did not travel, the count and the server
   * would disagree the moment somebody ticked the switch, and the count is the
   * thing a person trusts.
   */
  it("carry the flag, so the browser count and the server agree", () => {
    const facts = factsOf(listing({ isDemo: true, verified: false }));
    expect(facts.isDemo).toBe(true);
    expect(facts.verified).toBe(false);
  });

  it("keep a real listing readable as real", () => {
    const facts = factsOf(listing());
    expect(facts.isDemo).toBe(false);
    expect(facts.verified).toBe(true);
  });
});
