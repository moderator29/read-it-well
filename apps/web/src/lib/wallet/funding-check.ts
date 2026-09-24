import { PaystackError } from "../payments/paystack";

/** MON-20. What a person reads when the processor has no such payment. */
export const NO_SUCH_PAYMENT_MESSAGE =
  "We have no payment under that reference. If money left your account, contact support with the reference and we will trace it.";

/** What a person reads when the processor could not be asked. */
export const FUNDING_CHECK_UNAVAILABLE_MESSAGE =
  "The payment could not be checked just now. If you completed it, your balance updates automatically in a moment.";

/**
 * The answer to a funding check the processor refused. A 404 or 400 means it
 * has no payment under that reference, so there is nothing to wait for; any
 * other failure may still resolve, and the reconciler posts it if it does.
 */
export function fundingCheckRefusal(error: unknown): string {
  if (error instanceof PaystackError && (error.status === 404 || error.status === 400)) {
    return NO_SUCH_PAYMENT_MESSAGE;
  }
  return FUNDING_CHECK_UNAVAILABLE_MESSAGE;
}
