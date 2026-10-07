import { describe, expect, it } from "vitest";
import {
  boardFromParams,
  boardHref,
  confettiPieces,
  hrefFor,
  monogram,
  movement,
  myRow,
  nextTier,
  parseRows,
  periodFromParams,
  podium,
  restOf,
  tierFor,
  toNextRank,
} from "./model";
import { emptyTitle, movementWords, shareText, unitFor } from "./copy";

const raw = (over: Record<string, unknown>) => ({
  rank: 1,
  previous_rank: null,
  kind: "member",
  display_name: "Ada O.",
  ref: "ada",
  avatar_url: null,
  place_code: "LA",
  place_name: "Lagos",
  verified: true,
  score: 3,
  next_score: null,
  total: 4,
  is_me: false,
  ...over,
});

describe("the leaderboard read, parsed", () => {
  it("keeps only rows with a rank, a name, a known kind and a count above zero", () => {
    const rows = parseRows([
      raw({}),
      raw({ rank: 2, display_name: "", score: 2 }),
      raw({ rank: 3, kind: "wizard" }),
      raw({ rank: 4, score: 0 }),
      raw({ rank: 5, score: "2", display_name: "Tunde B." }),
      null,
      "x",
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Ada O.", "Tunde B."]);
    expect(rows[1]!.score).toBe(2);
  });

  it("never carries a field the read does not send (no amount, phone or email)", () => {
    const [row] = parseRows([raw({ email: "a@b.c", phone: "080", amount_minor: 5 })]);
    expect(Object.keys(row!).sort()).toEqual(
      ["avatarUrl", "isMe", "kind", "name", "nextScore", "placeCode", "placeName", "previousRank", "rank", "ref", "score", "total", "verified"].sort(),
    );
  });

  it("answers a non-array with no rows", () => {
    expect(parseRows(null)).toEqual([]);
    expect(parseRows({ rows: [] })).toEqual([]);
  });
});

describe("the podium", () => {
  const rows = parseRows([1, 2, 3, 4, 5].map((n) => raw({ rank: n, display_name: `P${n}`, ref: `p${n}`, score: 10 - n })));

  it("stands second, first, third, left to right", () => {
    expect(podium(rows).map((r) => r?.name)).toEqual(["P2", "P1", "P3"]);
    expect(restOf(rows).map((r) => r.name)).toEqual(["P4", "P5"]);
  });

  it("leaves a place empty rather than inventing somebody", () => {
    expect(podium(rows.slice(0, 1))).toEqual([null, rows[0], null]);
    expect(podium([])).toEqual([null, null, null]);
  });

  it("finds the caller's best row", () => {
    const mine = parseRows([raw({ rank: 4, is_me: true, ref: "a" }), raw({ rank: 9, is_me: true, ref: "b" }), raw({ rank: 1, ref: "c" })]);
    expect(myRow(mine)?.rank).toBe(4);
    expect(myRow(parseRows([raw({})]))).toBeNull();
  });
});

describe("movement, tiers and the next step", () => {
  it("says a direction and a number, never colour alone", () => {
    expect(movement({ rank: 3, previousRank: 7 })).toEqual({ direction: "up", by: 4 });
    expect(movement({ rank: 7, previousRank: 3 })).toEqual({ direction: "down", by: 4 });
    expect(movement({ rank: 3, previousRank: 3 })).toEqual({ direction: "same", by: 0 });
    expect(movement({ rank: 3, previousRank: null })).toEqual({ direction: "new", by: 0 });
    expect(movementWords({ direction: "up", by: 2 }, "month")).toBe("Up 2 since last month");
  });

  it("words the tier from the real thresholds, gold at the top", () => {
    expect(tierFor("referrals", 0)).toBeNull();
    expect(tierFor("referrals", 1)).toBe("Rising");
    expect(tierFor("referrals", 5)).toBe("Trusted");
    expect(tierFor("referrals", 15)).toBe("Platinum");
    expect(tierFor("referrals", 40)).toBe("Gold");
    expect(tierFor("property", 3)).toBe("Trusted");
    expect(nextTier("referrals", 3)).toEqual({ word: "Trusted", needed: 2 });
    expect(nextTier("referrals", 99)).toBeNull();
  });

  it("counts what the rank above needs, and nothing at the top", () => {
    expect(toNextRank({ score: 3, nextScore: 7 })).toBe(4);
    expect(toNextRank({ score: 3, nextScore: null })).toBeNull();
  });
});

describe("links and words", () => {
  it("opens people on their profile and a business on its page", () => {
    expect(hrefFor({ kind: "agent", ref: "ada" })).toBe("/u/ada");
    expect(hrefFor({ kind: "restaurant", ref: "b1" })).toBe("/restaurant/b1");
    expect(hrefFor({ kind: "hotel", ref: "a1" })).toBe("/stay/a1");
    expect(hrefFor({ kind: "firm", ref: "x" })).toBeNull();
    expect(hrefFor({ kind: "member", ref: null })).toBeNull();
  });

  it("round-trips the board, sub-board and period through the URL", () => {
    expect(boardFromParams({ board: "top", sub: "hotels" })).toBe("hotels");
    expect(boardFromParams({ board: "top", sub: "nope" })).toBe("property");
    expect(boardFromParams({})).toBe("referrals");
    expect(periodFromParams("all")).toBe("all");
    expect(periodFromParams(undefined)).toBe("month");
    expect(boardHref("restaurants", "all")).toBe("/leaderboard?board=top&sub=restaurants&period=all");
    expect(boardHref("referrals", "month", "/preview/leaderboard")).toBe("/preview/leaderboard?board=referrals");
  });

  it("says the unit with its count and the honest empty title", () => {
    expect(unitFor("property", 1)).toBe("deal");
    expect(unitFor("restaurants", 2)).toBe("tables");
    expect(emptyTitle("city", "Lagos")).toBe("Be the first in Lagos");
    expect(emptyTitle("global", "Lagos")).toBe("Be the first on Vallo");
    expect(shareText(2, "referrals", "Lagos", "month")).toBe("I'm #2 on Vallo's Referrals board in Lagos, this month.");
  });

  it("draws initials for a portrait without a photograph", () => {
    expect(monogram("Ada Okafor")).toBe("AO");
    expect(monogram("Eko")).toBe("E");
    expect(monogram("  ")).toBe("V");
  });

  it("seeds the confetti so the payoff is the same on every run", () => {
    expect(confettiPieces(5)).toEqual(confettiPieces(5));
    expect(confettiPieces(5)[0]!.x).toBeGreaterThanOrEqual(0);
  });
});
