import { describe, expect, it } from "vitest";
import {
  BADGE_ROW_MAX,
  MOMENT_WINDOW_DAYS,
  badgeToCelebrate,
  isEarnedGrant,
  pickBadges,
  quietlySeen,
  type ProfileBadge,
} from "./badge-model";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-06T12:00:00Z");

function badge(code: string, over: Partial<ProfileBadge> = {}): ProfileBadge {
  return {
    code,
    name: code,
    description: `${code} means something`,
    objectName: "shield-check",
    tier: 1,
    grantedAt: new Date(NOW - 2 * DAY).toISOString(),
    grantedLabel: "4 October 2026",
    earned: true,
    ...over,
  };
}

describe("the badge row (reference 7111 refused)", () => {
  it("never shows more than six, strongest tier first, then newest", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      badge(`b${i}`, { tier: i % 3, grantedAt: new Date(NOW - i * DAY).toISOString() }),
    );
    const row = pickBadges(many);
    expect(row).toHaveLength(BADGE_ROW_MAX);
    expect(row[0]!.tier).toBe(2);
    const tiers = row.map((b) => b.tier);
    expect([...tiers].sort((a, b) => b - a)).toEqual(tiers);
  });

  it("does not mutate what it is given", () => {
    const input = [badge("a", { tier: 1 }), badge("b", { tier: 3 })];
    pickBadges(input);
    expect(input.map((b) => b.code)).toEqual(["a", "b"]);
  });

  it("an earned badge is one the sweep awarded, never one an admin gave", () => {
    expect(isEarnedGrant({ grantedBy: null, manualOnly: false })).toBe(true);
    expect(isEarnedGrant({ grantedBy: "admin-id", manualOnly: false })).toBe(false);
    expect(isEarnedGrant({ grantedBy: null, manualOnly: true })).toBe(false);
  });
});

describe("the earned moment is for what is new and really earned", () => {
  it("celebrates the newest unseen earned badge inside the window", () => {
    const a = badge("a", { grantedAt: new Date(NOW - 5 * DAY).toISOString() });
    const b = badge("b", { grantedAt: new Date(NOW - 1 * DAY).toISOString() });
    expect(badgeToCelebrate([a, b], [], NOW)?.code).toBe("b");
  });

  it("never celebrates a badge somebody gave by hand", () => {
    expect(badgeToCelebrate([badge("g", { earned: false })], [], NOW)).toBeNull();
  });

  it("never celebrates one it has already shown", () => {
    expect(badgeToCelebrate([badge("a")], ["a"], NOW)).toBeNull();
  });

  it("does not congratulate somebody for a badge from long ago, and remembers it quietly", () => {
    const old = badge("old", { grantedAt: new Date(NOW - (MOMENT_WINDOW_DAYS + 5) * DAY).toISOString() });
    expect(badgeToCelebrate([old], [], NOW)).toBeNull();
    expect(quietlySeen([old], [], NOW)).toEqual(["old"]);
    expect(quietlySeen([old], ["old"], NOW)).toEqual([]);
  });
});
