import { describe, expect, it } from "vitest";
import { depositLine, depositRefusal } from "./deposits";
import { DEPOSIT_PREFIX, isDepositReference } from "../payments/references";

const money = (minor: number) => `N${minor / 100}`;
const when = (iso: string) => iso.slice(0, 10);

describe("restaurant deposits (D75)", () => {
  it("says where a deposit that took money went, every time", () => {
    const base = { amountMinor: 3_000_000, refundUntil: "2026-10-09T18:00:00Z" };
    expect(depositLine({ ...base, status: "due" }, money, when)).toContain("to hold this table");
    expect(depositLine({ ...base, status: "paid" }, money, when)).toContain("Cancel before 2026-10-09");
    expect(depositLine({ ...base, status: "applied" }, money, when)).toBe("Deposit of N30000 taken off your bill.");
    expect(depositLine({ ...base, status: "refund_due" }, money, when)).toContain("back to your card");
    expect(depositLine({ ...base, status: "refunded" }, money, when)).toContain("refunded to your card");
    expect(depositLine({ ...base, status: "forfeited" }, money, when)).toContain("cancellation rule");
    expect(depositLine({ ...base, status: "failed" }, money, when)).toBeNull();
  });

  it("every refusal is a sentence, and an unknown one says nothing was charged", () => {
    expect(depositRefusal("switched_off")).toMatch(/not open yet/);
    expect(depositRefusal("something_new")).toMatch(/Nothing has been charged/);
  });

  it("a deposit reference is shape-checked, not just prefixed", () => {
    expect(isDepositReference(`${DEPOSIT_PREFIX}0f8fad5b-d9cb-469f-a165-70867728950e`)).toBe(true);
    expect(isDepositReference(`${DEPOSIT_PREFIX}not-a-uuid`)).toBe(false);
    expect(isDepositReference("rm-book-0f8fad5b-d9cb-469f-a165-70867728950e")).toBe(false);
  });
});
