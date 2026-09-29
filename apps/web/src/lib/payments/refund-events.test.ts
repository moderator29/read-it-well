import { describe, expect, it } from "vitest";
import { readRefundEvent } from "./refund-events";

describe("readRefundEvent (V-24)", () => {
  it("reads a processed refund by its id and the charge's reference", () => {
    expect(readRefundEvent("refund.processed", { id: 1234, transaction_reference: "rm-book-abc", amount: 500000 })).toEqual({
      status: "processed",
      processorRefundId: "1234",
      transactionReference: "rm-book-abc",
      amountMinor: 500000,
    });
  });
  it("finds the reference on a nested transaction, and reads a failure", () => {
    expect(readRefundEvent("refund.failed", { refund_id: "r1", transaction: { reference: "rm-book-x" } })).toEqual({
      status: "failed",
      processorRefundId: "r1",
      transactionReference: "rm-book-x",
      amountMinor: null,
    });
  });
  it("falls back to refund_reference for the id, and never reads a fractional or negative amount", () => {
    expect(readRefundEvent("refund.processed", { refund_reference: "RR-9", transaction_reference: "rm-book-y", amount: "7000" })).toMatchObject({
      processorRefundId: "RR-9",
      amountMinor: 7000,
    });
    expect(readRefundEvent("refund.processed", { id: 1, amount: 1.5 })?.amountMinor).toBeNull();
    expect(readRefundEvent("refund.processed", { id: 1, amount: -5 })?.amountMinor).toBeNull();
  });
  it("ignores other events and a delivery it cannot match", () => {
    expect(readRefundEvent("refund.pending", { id: 1 })).toBeNull();
    expect(readRefundEvent("charge.success", { id: 1 })).toBeNull();
    expect(readRefundEvent("refund.processed", {})).toBeNull();
    expect(readRefundEvent("refund.processed", null)).toBeNull();
  });
});
