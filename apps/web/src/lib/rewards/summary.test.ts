import { describe, expect, it } from "vitest";

import { canWithdraw, pendingExplanation, programmeLine, toRewardsSummary } from "./summary";

describe("rewards summary", () => {
  it("never shows more available than the ledger owes", () => {
    const s = toRewardsSummary({ balance_minor: 7600, available_minor: 15200, withdrawal_min_minor: 100000 });
    expect(s?.availableMinor).toBe(7600);
    expect(s?.withdrawalMinMinor).toBe(100000);
  });

  it("a negative balance (a reversal after payment) shows nothing available", () => {
    expect(toRewardsSummary({ balance_minor: -7600, available_minor: 7600 })?.availableMinor).toBe(0);
  });

  it("withdrawal is offered only at the minimum and with nothing sent and unconfirmed", () => {
    const at = toRewardsSummary({
      balance_minor: 100000,
      available_minor: 100000,
      withdrawal_min_minor: 100000,
      payouts_enabled: true,
    })!;
    expect(canWithdraw(at)).toBe(true);
    expect(canWithdraw({ ...at, payoutsEnabled: false })).toBe(false);
    expect(canWithdraw({ ...at, availableMinor: 99999 })).toBe(false);
    expect(canWithdraw({ ...at, sentMinor: 7600 })).toBe(false);
    expect(canWithdraw({ ...at, withdrawalMinMinor: null })).toBe(false);
  });

  it("payouts are off unless the policy says so", () => {
    expect(toRewardsSummary({ balance_minor: 1 })?.payoutsEnabled).toBe(false);
  });

  it("reads the campaign's terms and shows its requirements before anyone invites", () => {
    const s = toRewardsSummary({
      balance_minor: 0,
      campaign: {
        slug: "consumer-2026",
        reward_minor: 7600,
        member_cap_minor: 11400000,
        requirement_keys: ["phone_verified", "meaningful_activity", "not_a_key"],
        review_window_hours: 168,
      },
    })!;
    expect(s.campaign?.rewardMinor).toBe(7600);
    expect(s.campaign?.requirementLines).toHaveLength(2);
    expect(toRewardsSummary({ balance_minor: 0, campaign: { slug: "x", reward_minor: 0 } })?.campaign).toBeNull();
  });

  it("explains pending in one line, with roughly when", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    const s = toRewardsSummary({ balance_minor: 0, pending_minor: 7600, next_available_at: "2026-10-09T10:00:00Z" })!;
    expect(pendingExplanation(s, now)).toMatch(/about 3/);
    expect(pendingExplanation({ ...s, pendingMinor: 0 }, now)).toBeNull();
    expect(pendingExplanation({ ...s, nextAvailableAt: null }, now)).toMatch(/review window ends/);
  });

  it("a paused programme says so and stops inviting; anything unreadable reads as paused", () => {
    const open = toRewardsSummary({ balance_minor: 0, programme: { status: "open" } })!;
    expect(programmeLine(open).inviting).toBe(true);
    const paused = toRewardsSummary({ balance_minor: 0, programme: { status: "paused", reason: "budget_reached" } })!;
    expect(paused.programme).toEqual({ status: "paused", reason: "budget_reached" });
    expect(programmeLine(paused)).toMatchObject({ inviting: false });
    expect(programmeLine(paused).text).toMatch(/already earned are still paid/);
    expect(toRewardsSummary({ balance_minor: 0 })!.programme.status).toBe("paused");
  });

  it("null for a signed-out answer", () => {
    expect(toRewardsSummary(null)).toBeNull();
  });
});
