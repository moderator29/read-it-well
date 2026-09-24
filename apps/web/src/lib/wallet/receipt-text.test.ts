import { describe, expect, it } from "vitest";
import { receiptShareText } from "./receipt-text";

/**
 * MON-16: the shared receipt is proof of a payment on its own, which the old
 * "<kind> · <date> · <reference>" line was not.
 */
describe("receiptShareText (MON-16)", () => {
  const text = receiptShareText({
    kindLabel: "Payment",
    direction: "debit",
    amountMinor: 25_000_000,
    when: "24 September 2026, 10:15",
    note: "Sent to Ada Obi",
    property: "2 bedroom flat, Yaba",
    statusLabel: "Completed",
    reference: "rm-p2p-abc",
  });

  it("carries the amount and its direction", () => {
    expect(text).toMatch(/Money out: ₦\s?250,000/);
  });

  it("carries the date in Lagos time, the details, the property, the status and the reference", () => {
    expect(text).toContain("24 September 2026, 10:15 (Lagos time)");
    expect(text).toContain("Sent to Ada Obi");
    expect(text).toContain("2 bedroom flat, Yaba");
    expect(text).toContain("Status: Completed");
    expect(text).toContain("Reference: rm-p2p-abc");
  });

  it("names who issued it", () => {
    expect(text).toContain("Issued by VALLO SPACES LTD, RC 9870413");
  });

  it("leaves out lines it has nothing for", () => {
    const bare = receiptShareText({
      kindLabel: "Top-up",
      direction: "credit",
      amountMinor: 100_000,
      when: "1 August 2026, 11:00",
      note: null,
      property: null,
      statusLabel: "Completed",
      reference: "rm-fund-x",
    });
    expect(bare).not.toMatch(/Details:|Property:/);
    expect(bare).toMatch(/Money in/);
  });
});
