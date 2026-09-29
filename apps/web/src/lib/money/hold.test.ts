import { describe, expect, it } from "vitest";
import { moneyHoldRefusal, NEUTRAL_HOLD_REFUSAL } from "./hold";

/* SCUML items 6 and 8: a hold refusal never names a cause or a date it was not given. */
describe("moneyHoldRefusal", () => {
  it("is null for anything but the hold", () => {
    expect(moneyHoldRefusal(null)).toBeNull();
    expect(moneyHoldRefusal({ code: "23505", message: "duplicate" })).toBeNull();
  });
  it("says the neutral sentence for the database's undated refusal and for anything unexpected", () => {
    expect(moneyHoldRefusal({ code: "RM050", message: "A new payout account cannot be added to this account right now." })).toBe(NEUTRAL_HOLD_REFUSAL);
    expect(moneyHoldRefusal({ code: "RM050", message: "Money cannot leave this account until 1 October 2026." })).toBe(NEUTRAL_HOLD_REFUSAL);
    expect(moneyHoldRefusal({ code: "RM050", message: "" })).toBe(NEUTRAL_HOLD_REFUSAL);
    expect(NEUTRAL_HOLD_REFUSAL).not.toMatch(/\d|until|support|email|review|compliance/i);
  });
  it("passes through only the database's own dated form", () => {
    const own = "A new payout account cannot be added to this account until 1 October 2026, 10:00.";
    expect(moneyHoldRefusal({ code: "RM050", message: own })).toBe(own);
  });
});
