import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { refundLead, refundLineFor, refundMark, type RefundLine } from "./refund-lines";
import type { RefundRow } from "./rows";

/**
 * Which refund has reached the card (auditor A5). Only a processed refund
 * with its settled date is `landed` and draws the filled mark; a refund
 * Paystack has only started is good news in tone and still on its way.
 */

const copy = getDictionary("en").afterTheGate.refund;
const money = (minor: number) => `N${minor / 100}`;
const date = (value: string) => value.slice(0, 10);

const row = (over: Partial<RefundRow> = {}): RefundRow => ({
  id: "r1",
  bookingId: "b1",
  paidMinor: 10_000_00,
  refundMinor: 10_000_00,
  retainedMinor: 0,
  createdAt: "2026-10-01T10:00:00Z",
  processorStatus: "submitted",
  submittedAt: "2026-10-02T10:00:00Z",
  settledAt: null,
  ...over,
});

describe("refund lines", () => {
  it("marks a refund done only once Paystack reports it processed with a settled date", () => {
    const landed = refundLineFor(row({ processorStatus: "processed", settledAt: "2026-10-05T10:00:00Z" }), null, copy, money, date);
    expect(landed.landed).toBe(true);
    expect(refundMark(landed)).toBe("done");
  });

  it("draws an initiated refund as on its way, though its tone is good news", () => {
    const initiated = refundLineFor(row(), null, copy, money, date);
    expect(initiated.tone).toBe("success");
    expect(initiated.sentence).toBe(copy.initiated.replace("{date}", "2026-10-02"));
    expect(initiated.landed).toBe(false);
    expect(refundMark(initiated)).toBe("waiting");
  });

  it("does not call a processed refund landed without its settled date", () => {
    const line = refundLineFor(row({ processorStatus: "processed", settledAt: null }), null, copy, money, date);
    expect(line.landed).toBe(false);
    expect(refundMark(line)).toBe("waiting");
  });

  it("draws no mark for a line where nothing was owed", () => {
    const nothing = refundLineFor(row({ refundMinor: 0, processorStatus: "not_needed" }), null, copy, money, date);
    expect(refundMark(nothing)).toBeNull();
  });
});

describe("the sheet's lead figure", () => {
  const line = (over: Partial<RefundLine>): RefundLine => ({
    id: "x",
    amount: "N100 back",
    refundMinor: 10_000,
    retained: null,
    sentence: "s",
    tone: "success",
    landed: false,
    ...over,
  });

  it("leads with a single refund that returns something", () => {
    expect(refundLead([line({})])?.id).toBe("x");
  });

  it("never leads with a refund of nothing, and never with one of several", () => {
    expect(refundLead([line({ refundMinor: 0, amount: "N0 back" })])).toBeNull();
    expect(refundLead([line({}), line({ id: "y" })])).toBeNull();
    expect(refundLead([line({ amount: null, refundMinor: null })])).toBeNull();
  });
});
