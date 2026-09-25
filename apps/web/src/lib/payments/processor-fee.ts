import type { Json } from "../supabase/database.types";

/**
 * MON-14. What the processor kept out of a wallet top-up.
 *
 * A top-up credits the whole amount the member paid, and Paystack settles
 * Vallo that amount less its fee, so every top-up is a cost Vallo absorbs.
 * Until the founder decides whether the payer bears it, the cost is at least
 * recorded: every funding credit carries `processor_fee_minor` in its
 * metadata, the integer kobo the processor reported, or null when it reported
 * nothing (never a guess).
 */
export function processorFeeMetadata(fees: unknown): { processor_fee_minor: Json } {
  return {
    processor_fee_minor:
      typeof fees === "number" && Number.isSafeInteger(fees) && fees >= 0 ? fees : null,
  };
}
