/**
 * Why a refund did not reach Paystack on this call. Kept apart from refund.ts
 * (server-only) so the callers and their tests can read them without it.
 */

/** The refund was sent and no answer came back: check Paystack before retrying. */
export const UNKNOWN_OUTCOME = "unknown_outcome";

/** Another caller holds (or already used) this refund's claim; Paystack was not called. */
export const REFUND_ALREADY_CLAIMED = "refund_already_claimed";

/** The claim could not be taken (the database did not answer); Paystack was not called. */
export const REFUND_CLAIM_UNAVAILABLE = "refund_claim_unavailable";
