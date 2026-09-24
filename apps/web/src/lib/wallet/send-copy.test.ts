import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";

/**
 * MON-15: the send page's trust list promised refunds "in 3 to 5 business
 * days", which nothing enforces and which is not how refunds work: every
 * refund path (refund_and_cancel_booking, refund_booking_payment,
 * escrow_settle) posts a COMPLETED credit in the same transaction as the
 * decision.
 */
describe("the send page's refund line (MON-15)", () => {
  const copy = getDictionary("en").walletSend;

  it("promises no delay that nothing enforces", () => {
    expect(copy.trustRefund).not.toMatch(/business days|\d+ to \d+/i);
  });

  it("says a refund lands when it is decided", () => {
    expect(copy.trustRefund).toMatch(/the moment it is decided/i);
  });
});
