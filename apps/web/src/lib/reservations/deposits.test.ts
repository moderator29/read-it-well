import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { depositLine, depositRefusal, venueDepositLine } from "./deposits";
import { DEPOSIT_PREFIX, isDepositReference } from "../payments/references";

const money = (minor: number) => `N${minor / 100}`;
const when = (iso: string) => iso.slice(0, 10);
const words = getDictionary("en").tableDeposits;

describe("restaurant deposits (D75)", () => {
  it("says where a deposit that took money went, every time", () => {
    const base = { amountMinor: 3_000_000, refundUntil: "2026-10-09T18:00:00Z" };
    expect(depositLine({ ...base, status: "due" }, money, when, words.status)).toContain("to hold this table");
    expect(depositLine({ ...base, status: "paid" }, money, when, words.status)).toContain("Cancel before 2026-10-09");
    expect(depositLine({ ...base, status: "applied" }, money, when, words.status)).toBe("Deposit of N30000 taken off your bill.");
    expect(depositLine({ ...base, status: "refund_due" }, money, when, words.status)).toContain("back to your card");
    expect(depositLine({ ...base, status: "refunded" }, money, when, words.status)).toContain("refunded to your card");
    expect(depositLine({ ...base, status: "forfeited" }, money, when, words.status)).toContain("cancellation rule");
    expect(depositLine({ ...base, status: "failed" }, money, when, words.status)).toBeNull();
  });

  it("every refusal is a sentence, and an unknown one says nothing was charged", () => {
    expect(depositRefusal("switched_off", words.refusals)).toMatch(/not open yet/);
    expect(depositRefusal("something_new", words.refusals)).toMatch(/Nothing has been charged/);
  });

  it("the venue reads where the money is, its own share included", () => {
    const base = { amountMinor: 3_000_000, refundUntil: null, venueShareMinor: 2_940_000 };
    expect(venueDepositLine({ ...base, status: "due" }, money, words.desk.line)).toContain("not paid yet");
    expect(venueDepositLine({ ...base, status: "paid" }, money, words.desk.line)).toBe(
      "Deposit of N30000 paid. N29400 reaches your bank.",
    );
    expect(venueDepositLine({ ...base, status: "forfeited" }, money, words.desk.line)).toContain("kept by you");
    expect(venueDepositLine({ ...base, status: "abandoned" }, money, words.desk.line)).toBeNull();
  });

  it("every language says every deposit state", () => {
    for (const locale of ["en", "yo", "ig", "ha"] as const) {
      const w = getDictionary(locale).tableDeposits;
      for (const status of ["due", "paid", "applied", "refund_due", "refunded", "forfeited"]) {
        const line = depositLine({ status, amountMinor: 100_000, refundUntil: "2026-10-09T18:00:00Z" }, money, when, w.status);
        expect(line).toContain("N1000");
        expect(line).not.toContain("{");
      }
    }
  });

  it("a deposit reference is shape-checked, not just prefixed", () => {
    expect(isDepositReference(`${DEPOSIT_PREFIX}0f8fad5b-d9cb-469f-a165-70867728950e`)).toBe(true);
    expect(isDepositReference(`${DEPOSIT_PREFIX}not-a-uuid`)).toBe(false);
    expect(isDepositReference("rm-book-0f8fad5b-d9cb-469f-a165-70867728950e")).toBe(false);
  });
});
