import { describe, expect, it } from "vitest";
import type { Listing } from "@/lib/listings/types";
import { hasSignals, pickBestMatches, reasonText } from "./best-matches";

function listing(id: string, over: Partial<Listing> = {}): Listing {
  return {
    id,
    slug: id,
    title: id,
    kind: "rental",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 250_000_000,
    pricePeriod: "year",
    currency: "NGN",
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    bedrooms: 2,
    bathrooms: 2,
    ...over,
  };
}

const none = { interests: [], searches: [], saved: [] } as const;

describe("best matches", () => {
  it("has no signals for somebody who has said and kept nothing, and then picks nothing", () => {
    expect(hasSignals(none)).toBe(false);
    expect(pickBestMatches({ pool: [listing("a"), listing("b")], ...none })).toEqual([]);
  });

  it("counts any one of the three signals", () => {
    expect(hasSignals({ ...none, interests: ["land"] })).toBe(true);
    expect(hasSignals({ ...none, searches: [{ label: "x", listings: [] }] })).toBe(true);
    expect(hasSignals({ ...none, saved: [listing("s")] })).toBe(true);
  });

  it("names the stated kind as the reason, and leaves out kinds nobody asked for", () => {
    const matches = pickBestMatches({
      pool: [listing("flat", { kind: "apartment" }), listing("plot", { kind: "land" })],
      ...none,
      interests: ["land"],
    });
    expect(matches.map((m) => m.listing.id)).toEqual(["plot"]);
    expect(matches[0]!.reason).toEqual({ kind: "interest", type: "land" });
  });

  it("names a saved search when the catalogue returned the place for it, even outside the pool", () => {
    const hit = listing("lekki", { area: "Lekki" });
    const matches = pickBestMatches({
      pool: [listing("other", { kind: "home" })],
      ...none,
      searches: [{ label: "2 bed flats in Lekki", listings: [hit] }],
    });
    expect(matches).toHaveLength(1);
    expect(matches[0]!.listing.id).toBe("lekki");
    expect(matches[0]!.reason).toEqual({ kind: "search", label: "2 bed flats in Lekki" });
  });

  it("prefers the saved search over the stated kind, and the stated kind over a saved area", () => {
    const both = listing("both", { kind: "land", area: "Ikeja" });
    const matches = pickBestMatches({
      pool: [both],
      interests: ["land"],
      searches: [{ label: "Land in Ikeja", listings: [both] }],
      saved: [listing("kept", { area: "Ikeja" })],
    });
    expect(matches[0]!.reason.kind).toBe("search");
    const noSearch = pickBestMatches({
      pool: [both],
      interests: ["land"],
      searches: [],
      saved: [listing("kept", { area: "Ikeja" })],
    });
    expect(noSearch[0]!.reason.kind).toBe("interest");
  });

  it("matches a saved place's area, ignoring case, and says the area as the saved listing spelled it", () => {
    const matches = pickBestMatches({
      pool: [listing("near", { area: "lekki phase 1", kind: "home" })],
      ...none,
      saved: [listing("kept", { area: "Lekki Phase 1", kind: "villa" })],
    });
    expect(matches[0]!.reason).toEqual({ kind: "saved", area: "Lekki Phase 1" });
  });

  it("does not treat a city name as an area, so saving one flat in Lagos does not match all of Lagos", () => {
    const matches = pickBestMatches({
      pool: [listing("any", { area: "Lagos", city: "Lagos" })],
      ...none,
      saved: [listing("kept", { area: "Lagos", city: "Lagos" })],
    });
    expect(matches).toEqual([]);
  });

  it("never offers a place that is already on the shortlist", () => {
    const kept = listing("kept", { kind: "land" });
    const matches = pickBestMatches({ pool: [kept], ...none, interests: ["land"], saved: [kept] });
    expect(matches).toEqual([]);
  });

  it("moves places already drawn higher on the screen behind the others without dropping them", () => {
    const pool = [listing("a"), listing("b"), listing("c")];
    const matches = pickBestMatches({
      pool,
      ...none,
      interests: ["rental"],
      onScreen: new Set(["a"]),
    });
    expect(matches.map((m) => m.listing.id)).toEqual(["b", "c", "a"]);
  });

  it("keeps the pool's own order and stops at the limit", () => {
    const pool = Array.from({ length: 12 }, (_, i) => listing(`l${i}`));
    const matches = pickBestMatches({ pool, ...none, interests: ["rental"], limit: 5 });
    expect(matches.map((m) => m.listing.id)).toEqual(["l0", "l1", "l2", "l3", "l4"]);
  });

  it("writes the reason from the dictionary's templates", () => {
    const copy = {
      reasonSearch: "Matches your saved search: {label}",
      reasonInterest: "You said you came for {kind}",
      reasonSaved: "Like places you saved in {area}",
    };
    const lower = (value: string) => value.toLowerCase();
    expect(reasonText({ kind: "search", label: "Flats" }, copy, {}, lower)).toBe("Matches your saved search: Flats");
    expect(reasonText({ kind: "interest", type: "land" }, copy, { land: "Land" }, lower)).toBe(
      "You said you came for land",
    );
    expect(reasonText({ kind: "saved", area: "Yaba" }, copy, {}, lower)).toBe("Like places you saved in Yaba");
  });

  it("never invents a score: no reason carries a percentage", () => {
    const [match] = pickBestMatches({ pool: [listing("a")], ...none, interests: ["rental"] });
    expect(JSON.stringify(match)).not.toMatch(/%|percent|score/i);
  });
});
