import { describe, expect, it } from "vitest";
import type { DirEntry } from "@/lib/directory/model";
import {
  ROW_LIMIT,
  directoryRow,
  mostFollowedRow,
  realCount,
  visibleRows,
  type FollowedProfile,
  type ProfileFacts,
} from "./people-discovery-model";

/**
 * THE PEOPLE PAGE NEVER INVENTS A RANK. Every figure on a card is a count the
 * database holds, a figure that is zero or absent is not drawn, and a row with
 * nobody in it is not drawn. These pin the three rules on stand-in rows.
 */

function entry(over: Partial<DirEntry> & Pick<DirEntry, "kind" | "name">): DirEntry {
  return {
    ref: null,
    avatarUrl: null,
    placeCode: null,
    placeName: null,
    area: null,
    verified: false,
    completed: 0,
    liveListings: 0,
    since: null,
    ...over,
  };
}

function facts(userId: string, followers: number, over: Partial<ProfileFacts> = {}): ProfileFacts {
  return { userId, followers, tier: "none", viewerFollows: false, isViewer: false, avatarUrl: null, displayLabel: null, ...over };
}

const FACTS = new Map<string, ProfileFacts>([
  ["a", facts("ua", 10)],
  ["b", facts("ub", 500)],
  ["c", facts("uc", 0)],
  ["d", facts("ud", 30)],
  ["z", facts("uz", 0)],
]);

describe("realCount", () => {
  it("is a whole number above zero, or null: never a zero, a negative or a NaN", () => {
    expect(realCount(12)).toBe(12);
    expect(realCount("7")).toBe(7);
    expect(realCount(12.9)).toBe(12);
    for (const bad of [0, -3, Number.NaN, null, undefined, "", "x", Infinity]) expect(realCount(bad)).toBeNull();
  });
});

describe("a directory shelf (Top landlords, Top agents, Top hotels)", () => {
  const people = [
    entry({ kind: "landlord", name: "A Landlord", ref: "a", completed: 2, liveListings: 1 }),
    entry({ kind: "landlord", name: "B Landlord", ref: "b", verified: true, completed: 1 }),
    entry({ kind: "landlord", name: "C Landlord", ref: "c", completed: 9 }),
    entry({ kind: "landlord", name: "Z Newcomer", ref: "z" }),
    entry({ kind: "agent", name: "An Agent", ref: "d", completed: 5 }),
  ];

  it("takes only its own kind, in the directory's order: verified, then completed deals, then live listings", () => {
    const row = directoryRow("top-landlords", people, FACTS);
    expect(row.cards.map((c) => c.handle)).toEqual(["b", "c", "a"]);
    expect(directoryRow("top-agents", people, FACTS).cards.map((c) => c.handle)).toEqual(["d"]);
  });

  it("leaves out somebody with no figure at all rather than ranking them last", () => {
    const row = directoryRow("top-landlords", people, FACTS);
    expect(row.cards.map((c) => c.handle)).not.toContain("z");
  });

  it("breaks a tie on follower count, then the name, never on anything invented", () => {
    const tied = [
      entry({ kind: "agent", name: "Alpha", ref: "a", completed: 3 }),
      entry({ kind: "agent", name: "Beta", ref: "b", completed: 3 }),
      entry({ kind: "agent", name: "Gamma", ref: "d", completed: 3 }),
    ];
    expect(directoryRow("top-agents", tied, FACTS).cards.map((c) => c.handle)).toEqual(["b", "d", "a"]);
  });

  it("draws a follower count only when there is one, and a metric only from a real count", () => {
    const row = directoryRow("top-landlords", people, FACTS);
    const c = row.cards.find((card) => card.handle === "c")!;
    expect(c.followers).toBeNull();
    expect(c.metric).toEqual({ kind: "deals", count: 9 });
    const a = row.cards.find((card) => card.handle === "a")!;
    expect(a.followers).toBe(10);
    /* Completed deals lead; live listings are the fallback, never both. */
    expect(a.metric).toEqual({ kind: "deals", count: 2 });
    const onlyListings = directoryRow("top-landlords", [entry({ kind: "landlord", name: "L", ref: "a", liveListings: 4 })], FACTS);
    expect(onlyListings.cards[0]!.metric).toEqual({ kind: "listings", count: 4 });
  });

  it("is capped at one shelf's worth", () => {
    const many = Array.from({ length: ROW_LIMIT + 5 }, (_, i) => entry({ kind: "agent", name: `Agent ${i}`, ref: `h${i}`, completed: i + 1 }));
    expect(directoryRow("top-agents", many, new Map()).cards).toHaveLength(ROW_LIMIT);
  });

  it("draws a person only if there is a profile to open", () => {
    const row = directoryRow("top-agents", [entry({ kind: "agent", name: "No Handle", ref: null, completed: 4 })], FACTS);
    expect(row.cards).toEqual([]);
  });

  it("offers Follow to a person with a profile read, and not to one the read did not find", () => {
    const found = directoryRow("top-agents", [entry({ kind: "agent", name: "Found", ref: "d", completed: 1 })], FACTS);
    expect(found.cards[0]!.followable).toBe(true);
    const unread = directoryRow("top-agents", [entry({ kind: "agent", name: "Unread", ref: "nobody", completed: 1 })], FACTS);
    expect(unread.cards[0]!.followable).toBe(false);
  });

  it("hotels come from the stays directory, open the stay page and have no Follow", () => {
    const stays = [
      entry({ kind: "hotel", name: "Marina", ref: "hotel/marina", verified: true, completed: 38 }),
      entry({ kind: "hotel", name: "Quiet", ref: "hotel/quiet", liveListings: 6 }),
      entry({ kind: "host", name: "A Host", ref: "host/h", completed: 99 }),
      entry({ kind: "hotel", name: "Empty", ref: "hotel/empty" }),
    ];
    const row = directoryRow("top-hotels", stays, new Map());
    expect(row.cards.map((c) => c.name)).toEqual(["Marina", "Quiet"]);
    expect(row.cards.every((c) => !c.followable && c.handle === null && c.href.startsWith("/stay/"))).toBe(true);
    expect(row.cards[0]!.metric).toEqual({ kind: "stays", count: 38 });
    expect(row.cards[1]!.metric).toEqual({ kind: "rooms", count: 6 });
    /* A hotel has no follower count on this page: nothing is invented. */
    expect(row.cards.every((c) => c.followers === null)).toBe(true);
  });
});

describe("Most followed", () => {
  const profiles: FollowedProfile[] = [
    { ...facts("u1", 40), handle: "forty", supplyRole: "agent" },
    { ...facts("u2", 900), handle: "nine_hundred", supplyRole: "owner" },
    { ...facts("u3", 0), handle: "nobody_follows", supplyRole: null },
    { ...facts("u4", 40), handle: "also_forty", supplyRole: null },
  ];

  it("ranks by the follower count alone, highest first, handle as the tie-break", () => {
    expect(mostFollowedRow(profiles).cards.map((c) => c.handle)).toEqual(["nine_hundred", "also_forty", "forty"]);
  });

  it("leaves out anybody with no followers", () => {
    expect(mostFollowedRow(profiles).cards.map((c) => c.handle)).not.toContain("nobody_follows");
  });

  it("names a role only where the account has a side, and otherwise none", () => {
    const cards = mostFollowedRow(profiles).cards;
    expect(cards.find((c) => c.handle === "nine_hundred")!.role).toBe("landlord");
    expect(cards.find((c) => c.handle === "forty")!.role).toBe("agent");
    expect(cards.find((c) => c.handle === "also_forty")!.role).toBeNull();
  });
});

describe("what the page draws", () => {
  it("hides every row with nobody in it, and keeps the fixed order of the rest", () => {
    const rows = visibleRows([
      mostFollowedRow([{ ...facts("u", 5), handle: "h", supplyRole: null }]),
      directoryRow("top-landlords", [], new Map()),
      directoryRow("top-agents", [entry({ kind: "agent", name: "A", ref: "d", completed: 1 })], FACTS),
      directoryRow("top-hotels", [], new Map()),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["top-agents", "most-followed"]);
  });

  it("draws nothing at all when there is no data", () => {
    expect(
      visibleRows([
        directoryRow("top-landlords", [], new Map()),
        directoryRow("top-agents", [], new Map()),
        directoryRow("top-hotels", [], new Map()),
        mostFollowedRow([]),
      ]),
    ).toEqual([]);
  });
});
