import { describe, expect, it } from "vitest";

import {
  BUSINESS_LADDER,
  BUSINESS_RUNGS,
  BUSINESS_TIER_NAME,
  asBusinessTier,
  businessTier,
  businessVerified,
  ladderView,
  nextRung,
} from "./business-ladder";

/* Rule 1, checked as a codepoint so this file carries no dash itself. */
const EM_DASH = String.fromCharCode(0x2014);

/**
 * The tier law in TypeScript has to agree with `private.business_tier` in
 * M15: rungs passed with no gap below. Every case here is one the SQL would
 * answer the same way.
 */
describe("businessTier", () => {
  it("is zero with nothing recorded", () => {
    expect(businessTier([])).toBe(0);
  });

  it("counts passed rungs from the bottom up", () => {
    expect(businessTier([{ rung: "identity", status: "passed" }])).toBe(1);
    expect(
      businessTier([
        { rung: "identity", status: "passed" },
        { rung: "registration", status: "passed" },
      ]),
    ).toBe(2);
    expect(
      businessTier(BUSINESS_RUNGS.map((rung) => ({ rung, status: "passed" }))),
    ).toBe(4);
  });

  it("stops at the first gap, so a stranded visit promotes nobody", () => {
    expect(
      businessTier([
        { rung: "identity", status: "passed" },
        { rung: "payout", status: "passed" },
        { rung: "on_site", status: "passed" },
      ]),
    ).toBe(1);
    expect(businessTier([{ rung: "on_site", status: "passed" }])).toBe(0);
  });

  it("does not count a failed or pending rung", () => {
    expect(
      businessTier([
        { rung: "identity", status: "failed" },
        { rung: "registration", status: "passed" },
      ]),
    ).toBe(0);
    expect(businessTier([{ rung: "identity", status: "pending" }])).toBe(0);
  });

  it("ignores a rung it does not know", () => {
    expect(businessTier([{ rung: "identity", status: "passed" }, { rung: "tin", status: "passed" }])).toBe(1);
  });
});

describe("badge law", () => {
  it("lights only for a first-party row with identity passed", () => {
    expect(businessVerified("first_party", 1)).toBe(true);
    expect(businessVerified("first_party", 0)).toBe(false);
    expect(businessVerified("partner", 4)).toBe(false);
  });
});

describe("ladderView and nextRung", () => {
  it("marks a passed rung above a gap as stranded", () => {
    const view = ladderView([
      { rung: "identity", status: "passed", decidedAt: "2026-09-18T10:00:00Z" },
      { rung: "payout", status: "passed", note: null },
    ]);
    expect(view.map((row) => row.status)).toEqual(["passed", "pending", "passed", "pending"]);
    expect(view.map((row) => row.stranded)).toEqual([false, false, true, false]);
    expect(view[0]?.decidedAt).toBe("2026-09-18T10:00:00Z");
  });

  it("names the next rung to work, and nothing once complete", () => {
    expect(nextRung([])).toBe("identity");
    expect(nextRung([{ rung: "identity", status: "passed" }])).toBe("registration");
    expect(nextRung(BUSINESS_RUNGS.map((rung) => ({ rung, status: "passed" })))).toBeNull();
  });
});

describe("the words", () => {
  it("has a name for every tier and a meaning for every rung, none with an em dash", () => {
    for (const tier of [0, 1, 2, 3, 4] as const) {
      expect(BUSINESS_TIER_NAME[tier].length).toBeGreaterThan(0);
    }
    expect(BUSINESS_TIER_NAME[0]).toBe("Approved");
    for (const rung of BUSINESS_RUNGS) {
      expect(BUSINESS_LADDER[rung].guestMeaning).not.toContain(EM_DASH);
      expect(BUSINESS_LADDER[rung].reviewerDoes).not.toContain(EM_DASH);
      expect(BUSINESS_LADDER[rung].step).toBe(BUSINESS_RUNGS.indexOf(rung) + 1);
    }
    expect(asBusinessTier(7)).toBe(0);
    expect(asBusinessTier(null)).toBe(0);
  });
});
