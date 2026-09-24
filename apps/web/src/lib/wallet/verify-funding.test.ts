import { describe, expect, it } from "vitest";
import { PaystackError } from "../payments/paystack";
import {
  FUNDING_CHECK_UNAVAILABLE_MESSAGE,
  NO_SUCH_PAYMENT_MESSAGE,
  fundingCheckRefusal,
} from "./funding-check";

/**
 * MON-20. A funding check on a reference the processor has never seen said
 * "your balance updates automatically in a moment", sending somebody to wait
 * for a credit that cannot arrive. verifyFunding answers a refused check with
 * fundingCheckRefusal.
 */
describe("fundingCheckRefusal (MON-20)", () => {
  it.each([404, 400])("says there is no such payment on a %i", (status) => {
    expect(fundingCheckRefusal(new PaystackError("Transaction reference not found", status))).toBe(
      NO_SUCH_PAYMENT_MESSAGE,
    );
    expect(NO_SUCH_PAYMENT_MESSAGE).toMatch(/Nothing was charged/);
  });

  it("keeps the wait-and-see answer when the processor could not be reached", () => {
    expect(fundingCheckRefusal(new PaystackError("Bad gateway", 502))).toBe(FUNDING_CHECK_UNAVAILABLE_MESSAGE);
    expect(fundingCheckRefusal(new Error("socket hang up"))).toBe(FUNDING_CHECK_UNAVAILABLE_MESSAGE);
  });
});
