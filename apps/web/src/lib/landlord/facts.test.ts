import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { OWNER_CONFIRMED_SHOWN_DAYS, collapseByProperty, ownerConfirmedLine, readListingFacts, readRentFact, sinkNotReconfirmed, type ListingFacts } from "./facts";

const copy = getDictionary("en").landlord.listing;
// 24 September 2026, 12:00 in Lagos.
const NOW = Date.parse("2026-09-24T11:00:00Z");

describe("Owner confirmed available N days ago", () => {
  it("says today, one day, and N days, on the Lagos calendar", () => {
    expect(ownerConfirmedLine(copy, "2026-09-24T08:00:00Z", NOW)).toBe("Owner confirmed available today");
    expect(ownerConfirmedLine(copy, "2026-09-23T08:00:00Z", NOW)).toBe("Owner confirmed available 1 day ago");
    expect(ownerConfirmedLine(copy, "2026-09-21T08:00:00Z", NOW)).toBe("Owner confirmed available 3 days ago");
    // 23:30 UTC on the 23rd is already the 24th in Lagos.
    expect(ownerConfirmedLine(copy, "2026-09-23T23:30:00Z", NOW)).toBe("Owner confirmed available today");
  });

  it("draws nothing for a null, a bad date, a future date or a stale one", () => {
    expect(ownerConfirmedLine(copy, null, NOW)).toBeNull();
    expect(ownerConfirmedLine(copy, undefined, NOW)).toBeNull();
    expect(ownerConfirmedLine(copy, "not a date", NOW)).toBeNull();
    expect(ownerConfirmedLine(copy, "2026-09-25T11:00:00Z", NOW)).toBeNull();
    const stale = new Date(NOW - (OWNER_CONFIRMED_SHOWN_DAYS + 1) * 86_400_000).toISOString();
    expect(ownerConfirmedLine(copy, stale, NOW)).toBeNull();
  });
});

describe("Not reconfirmed sorts last, and only that", () => {
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  it("moves the marked listings to the end and keeps both halves in order", () => {
    expect(sinkNotReconfirmed(rows, new Set(["a", "c"])).map((r) => r.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("leaves the order alone when nothing is marked", () => {
    expect(sinkNotReconfirmed(rows, new Set()).map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("reading the facts off the database", () => {
  it("reads listing facts and drops malformed rows", () => {
    const facts = readListingFacts([
      { listing_id: "a", owner_confirmed_at: "2026-09-20T00:00:00Z", not_reconfirmed: false, offer_count: 3 },
      { listing_id: "b", owner_confirmed_at: null, not_reconfirmed: true, offer_count: 1 },
      { nope: true },
      null,
    ]);
    expect(facts.size).toBe(2);
    expect(facts.get("a")).toEqual({ ownerConfirmedAt: "2026-09-20T00:00:00Z", notReconfirmed: false, offerCount: 3, propertyId: null });
    expect(facts.get("b")!.notReconfirmed).toBe(true);
    expect(readListingFacts(null).size).toBe(0);
  });

  it("reads the tenant's three dated facts, and nothing when nothing was asked", () => {
    expect(readRentFact(null)).toBeNull();
    expect(readRentFact({ state: "waiting" })).toBeNull();
    expect(readRentFact({ state: "waiting", asked_at: "2026-09-24T10:00:00Z", first_name: "Adebayo" })).toMatchObject({
      state: "waiting",
      firstName: "Adebayo",
    });
    expect(
      readRentFact({ state: "confirmed", asked_at: "2026-09-24T10:00:00Z", answered_at: "2026-09-25T10:00:00Z", first_name: " " }),
    ).toMatchObject({ state: "confirmed", firstName: null });
    // A confirmation with no date is not a fact.
    expect(readRentFact({ state: "confirmed", asked_at: "2026-09-24T10:00:00Z" })).toBeNull();
    expect(readRentFact({ state: "disputed", asked_at: "x", answered_at: "y" })).toMatchObject({ state: "disputed" });
  });
});

describe("one card per property on the shelf", () => {
  const fact = (propertyId: string | null, offerCount = 1): ListingFacts => ({
    ownerConfirmedAt: null,
    notReconfirmed: false,
    offerCount,
    propertyId,
  });

  it("keeps the first copy of a property in the page's order and counts the offers", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const facts = new Map([
      ["a", fact(null)],
      ["b", fact("p1", 3)],
      ["c", fact("p1", 3)],
      ["d", fact("p1", 3)],
    ]);
    const out = collapseByProperty(rows, facts);
    expect(out.listings.map((r) => r.id)).toEqual(["a", "b"]);
    expect(out.offerCounts.get("b")).toBe(3);
    expect(out.offerCounts.has("a")).toBe(false);
  });

  it("changes nothing when the facts did not load", () => {
    const rows = [{ id: "a" }, { id: "b" }];
    expect(collapseByProperty(rows, new Map()).listings).toEqual(rows);
  });
});
