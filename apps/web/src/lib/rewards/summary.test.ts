import { describe, expect, it } from "vitest";

import { canWithdraw, toRewardsSummary } from "./summary";

describe("rewards summary", () => {
  it("never shows more available than the ledger owes", () => {
    const s = toRewardsSummary({ balance_minor: 7000, available_minor: 14000, withdrawal_min_minor: 100000 });
    expect(s?.availableMinor).toBe(7000);
    expect(s?.withdrawalMinMinor).toBe(100000);
  });

  it("a negative balance (a reversal after payment) shows nothing available", () => {
    expect(toRewardsSummary({ balance_minor: -7000, available_minor: 7000 })?.availableMinor).toBe(0);
  });

  it("withdrawal is offered only at the policy minimum and with nothing in flight", () => {
    const at = toRewardsSummary({ balance_minor: 100000, available_minor: 100000, withdrawal_min_minor: 100000 })!;
    expect(canWithdraw(at)).toBe(true);
    expect(canWithdraw({ ...at, availableMinor: 99999 })).toBe(false);
    expect(canWithdraw({ ...at, processingMinor: 7000 })).toBe(false);
    expect(canWithdraw({ ...at, withdrawalMinMinor: null })).toBe(false);
  });

  it("null for a signed-out answer", () => {
    expect(toRewardsSummary(null)).toBeNull();
  });
});
