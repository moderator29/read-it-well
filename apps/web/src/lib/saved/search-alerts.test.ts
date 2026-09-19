import { describe, expect, it } from "vitest";

import type { Listing } from "../listings/types";
import { canonicalSearch } from "./searches";
import {
  filterFor,
  noticeCopy,
  planAlerts,
  type AlertCandidate,
  type AlertSubject,
} from "./search-alerts";

/**
 * THE ALERT IS A PUSH INTO SOMEBODY'S DAY, so everything about it has to be
 * true: the count, the direction of the watermark, and which account is told.
 *
 * The four failures these hold the line against, and every one of them has
 * shipped somewhere before:
 *
 *   1. A NUMBER NOBODY COUNTED. "3 new matches" over a list of five. The count
 *      in the notice is the count of the matched set in the same run, and
 *      these tests assert the two are the same number.
 *   2. THE BACK CATALOGUE, POSTED. A watermark that starts at zero tells a new
 *      search about every place on the platform.
 *   3. THE SAME PLACE, TWICE. A watermark that does not move repeats itself
 *      every run until somebody turns the alert off.
 *   4. SOMEBODY ELSE'S SEARCH. A notice addressed to the wrong account.
 */

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: "l1",
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

const NOON = "2026-09-19T12:00:00.000Z";
const ELEVEN = "2026-09-19T11:00:00.000Z";
const TEN = "2026-09-19T10:00:00.000Z";

function search(over: Partial<AlertSubject> = {}): AlertSubject {
  const canonical = canonicalSearch({ type: "apartment", beds: "2" });
  return {
    id: "s1",
    userId: "u1",
    label: "2 bed apartments",
    params: canonical.params,
    href: canonical.href,
    cursorAt: TEN,
    createdAt: TEN,
    ...over,
  };
}

function candidate(publishedAt: string, over: Partial<Listing> = {}): AlertCandidate {
  return { listing: listing(over), publishedAt };
}

describe("filterFor", () => {
  it("asks the catalogue the same question the shelf asks, plus one", () => {
    const filter = filterFor(canonicalSearch({ type: "apartment", beds: "2", market: "rent" }).params);
    expect(filter.kind).toBe("apartment");
    expect(filter.bedrooms).toBe(2);
    expect(filter.intent).toBe("rent");
    // The one difference, and it is deliberate: an alert never names an
    // example listing, because it claims a real place went up.
    expect(filter.excludeDemo).toBe(true);
  });
});

describe("planAlerts", () => {
  it("tells nobody anything when nothing went up", () => {
    const plan = planAlerts([search()], [], "/saved/searches");
    expect(plan.notices).toEqual([]);
    expect(plan.watermark).toBeNull();
    expect(plan.advance).toEqual([]);
  });

  it("counts the matches it found and puts that same number in the words", () => {
    const plan = planAlerts(
      [search()],
      [
        candidate(ELEVEN, { id: "a" }),
        candidate(NOON, { id: "b" }),
        candidate(NOON, { id: "c", bedrooms: 1 }),
      ],
      "/saved/searches",
    );
    expect(plan.notices).toHaveLength(1);
    expect(plan.notices[0]!.matches).toBe(2);
    expect(plan.matchedListings).toBe(2);
    expect(plan.notices[0]!.title).toContain("2 new places");
  });

  it("never reports a place that went up before the watermark", () => {
    const plan = planAlerts(
      [search({ cursorAt: ELEVEN })],
      [candidate(TEN, { id: "old" })],
      "/saved/searches",
    );
    expect(plan.notices).toEqual([]);
  });

  it("never reports a place published exactly at the watermark", () => {
    const plan = planAlerts(
      [search({ cursorAt: ELEVEN })],
      [candidate(ELEVEN, { id: "edge" })],
      "/saved/searches",
    );
    expect(plan.notices).toEqual([]);
  });

  it("moves the watermark to the newest thing it read, so nothing is told twice", () => {
    const first = planAlerts(
      [search()],
      [candidate(ELEVEN, { id: "a" }), candidate(NOON, { id: "b" })],
      "/saved/searches",
    );
    expect(first.watermark).toBe(NOON);
    expect(first.advance).toEqual(["s1"]);

    // The next run, with the watermark where the last one left it.
    const second = planAlerts(
      [search({ cursorAt: first.watermark })],
      [candidate(ELEVEN, { id: "a" }), candidate(NOON, { id: "b" })],
      "/saved/searches",
    );
    expect(second.notices).toEqual([]);
    expect(second.advance).toEqual([]);
  });

  it("falls back to when the search was made, so a new search is never posted the back catalogue", () => {
    const plan = planAlerts(
      [search({ cursorAt: null, createdAt: NOON })],
      [candidate(TEN, { id: "old" }), candidate(ELEVEN, { id: "older" })],
      "/saved/searches",
    );
    expect(plan.notices).toEqual([]);
  });

  it("judges each search against its own watermark", () => {
    const plan = planAlerts(
      [
        search({ id: "s1", cursorAt: TEN }),
        search({ id: "s2", cursorAt: NOON, userId: "u2" }),
      ],
      [candidate(ELEVEN, { id: "a" })],
      "/saved/searches",
    );
    expect(plan.notices).toHaveLength(1);
    expect(plan.notices[0]!.userId).toBe("u1");
    expect(plan.matchedIds).toEqual(["s1"]);
  });

  it("writes one notice per person however many of their searches matched", () => {
    const plan = planAlerts(
      [
        search({ id: "s1", label: "2 bed apartments" }),
        search({
          id: "s2",
          label: "Anything in Lagos",
          params: canonicalSearch({ q: "Lagos" }).params,
          href: canonicalSearch({ q: "Lagos" }).href,
        }),
      ],
      [candidate(NOON, { id: "a" })],
      "/saved/searches",
    );
    expect(plan.notices).toHaveLength(1);
    expect(plan.notices[0]!.searches).toBe(2);
    expect(plan.notices[0]!.matches).toBe(2);
    // Two searches, so the notice points at the list rather than at one of them.
    expect(plan.notices[0]!.href).toBe("/saved/searches");
    expect(plan.matchedSearches).toBe(2);
    // The same place matched twice, and it is ONE place.
    expect(plan.matchedListings).toBe(1);
  });

  it("points a single-search notice at that search's own results", () => {
    const plan = planAlerts([search()], [candidate(NOON, { id: "a" })], "/saved/searches");
    expect(plan.notices[0]!.href).toBe("/search?type=apartment&beds=2");
  });

  it("keeps two accounts apart", () => {
    const plan = planAlerts(
      [search({ id: "s1", userId: "u1" }), search({ id: "s2", userId: "u2" })],
      [candidate(NOON, { id: "a" })],
      "/saved/searches",
    );
    expect(plan.notices.map((notice) => notice.userId).sort()).toEqual(["u1", "u2"]);
    for (const notice of plan.notices) expect(notice.matches).toBe(1);
  });

  it("never names an example listing", () => {
    const plan = planAlerts(
      [search()],
      [candidate(NOON, { id: "example", isDemo: true, verified: false })],
      "/saved/searches",
    );
    expect(plan.notices).toEqual([]);
  });

  it("advances only the searches whose watermark is actually behind", () => {
    const ahead = "2026-09-19T13:00:00.000Z";
    const plan = planAlerts(
      [search({ id: "s1", cursorAt: TEN }), search({ id: "s2", cursorAt: ahead })],
      [candidate(NOON, { id: "a" })],
      "/saved/searches",
    );
    expect(plan.advance).toEqual(["s1"]);
  });

  it("ignores a timestamp it cannot read rather than treating it as the dawn of time", () => {
    const plan = planAlerts(
      [search()],
      [candidate("not a date", { id: "a" })],
      "/saved/searches",
    );
    expect(plan.notices).toEqual([]);
    expect(plan.watermark).toBeNull();
  });
});

describe("noticeCopy", () => {
  it("counts in the singular when one place went up", () => {
    expect(noticeCopy(1, 1, "2 bed apartments").title).toBe("A new place matches 2 bed apartments");
  });

  it("uses the number it was given and no other", () => {
    expect(noticeCopy(7, 1, "Lekki").title).toBe("7 new places match Lekki");
    expect(noticeCopy(7, 3, "Lekki").body).toContain("3 of your saved searches");
  });

  it("does not promise the results page shows only the new ones", () => {
    expect(noticeCopy(3, 1, "Lekki").body).toContain("everything that matches it now");
  });
});
