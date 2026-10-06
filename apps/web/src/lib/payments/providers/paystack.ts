import "server-only";

import { defineFiatProvider, type CollectionStatus } from "../provider";
import {
  initializeTransaction,
  isPaystackConfigured,
  listSuccessfulCharges,
  refundTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  type VerifiedTransactionStatus,
} from "../paystack";

/**
 * Paystack behind the fiat seam. Each method passes straight through to the
 * function already in `paystack.ts` with the same arguments and returns what
 * it returns, renamed only where the seam's neutral shape needs it, so moving
 * a call site onto the seam cannot change an outcome.
 * `paystack-provider.test.ts` proves the delegation.
 *
 * Declared: splits at the charge (the three-part Track A split), refunds by
 * API, lists successful charges. Never holds.
 */
export function paystackStatus(status: VerifiedTransactionStatus): CollectionStatus {
  switch (status) {
    case "success":
      return "success";
    case "failed":
      return "failed";
    /* Paystack says "abandoned" of any checkout opened and not yet paid, even
       while the payer is still on it, and a late payment still settles
       (`attempt-rules.ts`, judgeAttempt). It is never final. */
    case "reversed":
      return "reversed";
    default:
      return "pending";
  }
}

export const paystackProvider = defineFiatProvider(
  ["split_at_charge", "refund_without_dispute", "list_successful_charges"] as const,
  {
    id: "paystack",
    displayName: "Paystack",
    isConfigured: isPaystackConfigured,
    /* For a charge that is not split. Every payment one person makes to another uses collectWithSplit. */
    async collect(input) {
      const done = await initializeTransaction(input);
      return { reference: done.reference, redirectUrl: done.authorizationUrl };
    },
    async collectWithSplit(input) {
      const done = await initializeTransaction(input);
      return { reference: done.reference, redirectUrl: done.authorizationUrl };
    },
    /* A timeout throws `PaystackUnknownOutcome`, exactly as paystack.ts does; it is never mapped to failed. */
    async verifyByReference(reference) {
      const v = await verifyTransaction(reference);
      return { reference: v.reference, status: paystackStatus(v.status), providerStatus: v.status, amountMinor: v.amountMinor, paidAt: v.paidAt };
    },
    verifyWebhook(rawBody, headers) {
      return verifyWebhookSignature(rawBody, headers.get("x-paystack-signature") ?? "");
    },
    refund: refundTransaction,
    listSuccessfulCharges,
  },
);
