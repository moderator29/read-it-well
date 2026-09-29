import { describe, expect, it } from "vitest";
import { readMoveInQuote, readRefundRequest, readRefundRow } from "./rows";

describe("readMoveInQuote", () => {
  const good = {
    inspection_id: "i", listing_id: "l", quoted_at: "2026-10-01T10:00:00Z", currency: "NGN", rent_period: "year",
    rent_minor: 300_000_000, caution_minor: "30000000", service_minor: null, agency_minor: 30_000_000,
    legal_minor: 15_000_000, agreement_minor: null, total_minor: 390_000_000, total_stated: true,
  };
  it("reads a well-formed row, including bigint strings", () => {
    expect(readMoveInQuote(good)).toMatchObject({ total_minor: 390_000_000, caution_minor: 30_000_000 });
  });
  it("refuses a non-positive total or a missing flag", () => {
    expect(readMoveInQuote({ ...good, total_minor: 0 })).toBeNull();
    expect(readMoveInQuote({ ...good, total_stated: "yes" })).toBeNull();
    expect(readMoveInQuote(null)).toBeNull();
  });
  it("drops a fractional part rather than drawing it", () => {
    expect(readMoveInQuote({ ...good, agency_minor: 1.5 })?.agency_minor).toBeNull();
  });
});

describe("readRefundRow and readRefundRequest", () => {
  it("reads a refund and refuses one missing its money", () => {
    const row = {
      id: "r", booking_id: "b", created_at: "t", paid_minor: 10, refund_minor: 10, retained_minor: 0,
      processor_status: "submitted", processor_submitted_at: "s", processor_settled_at: null,
    };
    expect(readRefundRow(row)).toMatchObject({ refundMinor: 10, processorStatus: "submitted", submittedAt: "s", settledAt: null });
    expect(readRefundRow({ ...row, refund_minor: -1 })).toBeNull();
  });
  it("reads an unknown processor state as not sent yet, or not needed when nothing is owed", () => {
    const row = { id: "r", booking_id: "b", created_at: "t", paid_minor: 10, refund_minor: 10, retained_minor: 0 };
    expect(readRefundRow({ ...row, processor_status: "held" })?.processorStatus).toBe("pending");
    expect(readRefundRow({ ...row, refund_minor: 0, retained_minor: 10 })?.processorStatus).toBe("not_needed");
  });
  it("reads an ask with or without a due-by", () => {
    expect(readRefundRequest({ id: "q", booking_id: "b", requested_at: "t", due_by: "d" })).toEqual({ id: "q", bookingId: "b", requestedAt: "t", dueBy: "d" });
    expect(readRefundRequest({ id: "q", booking_id: "b", requested_at: "t" })?.dueBy).toBeNull();
    expect(readRefundRequest({ id: "q" })).toBeNull();
  });
});
