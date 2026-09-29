import { describe, expect, it } from "vitest";
import { cardReturnVerdict } from "./card-return";

/**
 * The money rule behind every card receipt (docs/SUCCESS_MOMENTS.md): the
 * success sheet opens only on a settlement against THIS booking. Each case
 * here was, before the rule, a "Payment received" sheet.
 */
describe("cardReturnVerdict", () => {
  const base = { bookingId: "bk-1", confirmed: false };

  it("celebrates a settlement against this booking", () => {
    expect(cardReturnVerdict({ ...base, outcome: "settled", confirmed: true }, "bk-1")).toBe("paid-confirmed");
    expect(cardReturnVerdict({ ...base, outcome: "settled" }, "bk-1")).toBe("paid");
    expect(cardReturnVerdict({ ...base, outcome: "already-settled", transactionStatus: "SUCCESSFUL" }, "bk-1")).toBe("paid");
    expect(cardReturnVerdict({ ...base, outcome: "share-settled" }, "bk-1")).toBe("share-paid");
  });

  it("does not celebrate a settlement against another booking of the same person", () => {
    expect(cardReturnVerdict({ ...base, bookingId: "bk-2", outcome: "settled", confirmed: true }, "bk-1")).toBe("unsure");
  });

  it("does not celebrate a refunded or refund-due charge, or one with no status", () => {
    for (const transactionStatus of ["REFUNDED", "REFUND_DUE", null, undefined, "PENDING"]) {
      expect(cardReturnVerdict({ ...base, outcome: "already-settled", transactionStatus }, "bk-1")).toBe("unsure");
    }
  });

  it("does not celebrate an answer that names no outcome", () => {
    expect(cardReturnVerdict({ ...base, confirmed: true }, "bk-1")).toBe("unsure");
  });
});
