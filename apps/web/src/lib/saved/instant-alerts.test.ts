import { describe, expect, it } from "vitest";
import { INSTANT_ALERTS_PER_DAY, lagosDay, splitByQuota } from "./instant-alerts";
import type { AlertPlan, AlertSubject } from "./search-alerts";

function subject(id: string, userId: string): AlertSubject {
  return { id, userId, label: id, params: {}, href: "/search", cursorAt: null, createdAt: "2026-09-01T00:00:00Z" };
}

const plan: AlertPlan = {
  notices: [
    { userId: "ada", title: "t", body: "b", href: "/search", matches: 1, searches: 1 },
    { userId: "bola", title: "t", body: "b", href: "/search", matches: 2, searches: 1 },
  ],
  watermark: "2026-09-24T09:00:00Z",
  advance: ["s-ada", "s-bola", "s-chidi"],
  matchedIds: ["s-ada", "s-bola"],
  matchedSearches: 2,
  matchedListings: 2,
};
const subjects = [subject("s-ada", "ada"), subject("s-bola", "bola"), subject("s-chidi", "chidi")];

describe("three instant alerts a day, then the morning digest", () => {
  it("is three", () => {
    expect(INSTANT_ALERTS_PER_DAY).toBe(3);
  });

  it("tells everybody under the cap now and moves their searches", () => {
    const split = splitByQuota(plan, subjects, new Map());
    expect(split.send.map((n) => n.userId)).toEqual(["ada", "bola"]);
    expect(split.defer).toEqual([]);
    expect(split.advance).toEqual(["s-ada", "s-bola", "s-chidi"]);
    expect(split.matched).toEqual(["s-ada", "s-bola"]);
  });

  it("defers a person at the cap and leaves their watermark for the digest", () => {
    const split = splitByQuota(plan, subjects, new Map([["bola", 3]]));
    expect(split.send.map((n) => n.userId)).toEqual(["ada"]);
    expect(split.defer.map((n) => n.userId)).toEqual(["bola"]);
    expect(split.advance).not.toContain("s-bola");
    expect(split.advance).toContain("s-chidi");
    expect(split.matched).toEqual(["s-ada"]);
  });

  it("resets on the Lagos day, not the UTC one", () => {
    expect(lagosDay(Date.parse("2026-09-24T22:59:00Z"))).toBe("2026-09-24");
    expect(lagosDay(Date.parse("2026-09-24T23:01:00Z"))).toBe("2026-09-25");
  });
});
