import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MONEY_HOLD_CODE, moneyHoldRefusal } from "./money-hold";
import { callMoneyRpc } from "./rpc";

const HELD = {
  code: "RM050",
  message:
    "Money cannot leave this account until 1 October 2026, 14:05, because its email address was changed by support.",
};

describe("the money hold reaches the person with its end date (SEC-15)", () => {
  it("shows the database's own sentence, date included", () => {
    expect(moneyHoldRefusal(HELD)).toBe(`${HELD.message} Your balance is untouched.`);
    expect(moneyHoldRefusal(HELD)).toContain("1 October 2026, 14:05");
  });

  it("falls back to a plain sentence when the message is not the expected one", () => {
    expect(moneyHoldRefusal({ code: MONEY_HOLD_CODE, message: "" })).toMatch(/for 7 days/);
  });

  it("is not the hold for any other error", () => {
    expect(moneyHoldRefusal(null)).toBeNull();
    expect(moneyHoldRefusal({ code: "23505", message: HELD.message })).toBeNull();
    expect(moneyHoldRefusal({ code: "P0001", message: "x" })).toBeNull();
  });

  it("carries the SQLSTATE through callMoneyRpc", async () => {
    const admin = { rpc: async () => ({ data: null, error: HELD }) };
    const result = await callMoneyRpc(admin as never, "withdraw", "hold_wallet_withdrawal", {});
    expect(result.outcome).toBe("failed");
    expect(result.outcome === "failed" ? moneyHoldRefusal(result) : null).toContain("1 October 2026");
  });

  it("is mapped on every door money leaves by", () => {
    const doors = [
      "lib/wallet/actions.ts",
      "lib/escrow/actions.ts",
      "lib/bookings/checkout.ts",
      "lib/payments/bank-accounts-actions.ts",
      "lib/agent/payout-actions.ts",
    ];
    for (const door of doors) {
      const source = readFileSync(join(process.cwd(), "src", door), "utf8");
      expect(source, door).toContain("moneyHoldRefusal(");
    }
    const wallet = readFileSync(join(process.cwd(), "src/lib/wallet/actions.ts"), "utf8");
    // Both withdrawal doors and the send.
    expect(wallet.match(/moneyHoldRefusal\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});
