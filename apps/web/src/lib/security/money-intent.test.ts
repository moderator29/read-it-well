import { describe, expect, it } from "vitest";
import { MONEY_KINDS, intentLine, isMoneyIntent } from "./money-intent";

describe("money intents (V-81, payout destinations only)", () => {
  it("guards only the actions that decide where money lands", () => {
    expect([...MONEY_KINDS].sort()).toEqual(
      ["add_lock", "bank_add", "bank_default", "payout_add", "payout_default", "payout_remove", "remove_lock"].sort(),
    );
    for (const retired of ["send", "withdraw", "pay_wallet", "escrow_fund", "escrow_confirm", "caution_return", "rent_share"]) {
      expect(isMoneyIntent({ kind: retired })).toBe(false);
    }
  });
  it("gives another account, another kind and another case of the same account the right lines", () => {
    const lines = new Set([
      intentLine({ kind: "bank_add", target: "058:0123456789" }),
      intentLine({ kind: "bank_add", target: "058:0123456780" }),
      intentLine({ kind: "payout_add", target: "058:0123456789" }),
    ]);
    expect(lines.size).toBe(3);
    expect(intentLine({ kind: "bank_default", target: "ABC " })).toBe(intentLine({ kind: "bank_default", target: "abc" }));
  });
});
