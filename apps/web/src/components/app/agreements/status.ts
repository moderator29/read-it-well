import type { StatusTone } from "@/components/ui/StatusPill";

/** The agreement's status in words, client-safe. */
export const AGREEMENT_STATUS_LABEL: Record<string, string> = {
  awaiting_parties: "Waiting for both of you to confirm",
  in_review: "With Vallo for review",
  approved: "Approved: payment is open",
  rejected: "Sent back by Vallo",
  cancelled: "Cancelled",
  paid: "Paid",
};

export const CLAIM_STATUS_LABEL: Record<string, string> = {
  submitted: "Waiting for Vallo",
  approved: "Approved, being paid",
  rejected: "Not approved",
  paid: "Paid to you",
};

/**
 * The agreement's status as a pill tone (`StatusPill`), so a list reads by
 * word, shape and colour together and never by colour alone. The tone is a
 * claim about what the reader should feel, mapped onto the pill's six shapes:
 *
 *   awaiting_parties  warning   hollow circle: waiting on somebody
 *   in_review         info      diamond: in motion, with Vallo
 *   approved          brand     hollow square: open, the next step is payment
 *   paid              success   filled circle: closed and done
 *   rejected          danger    filled square: sent back, needs a change
 *   cancelled         neutral   bar: no live state at all
 *
 * An unknown status is neutral, and its word is the raw status, so a new
 * value added to the enum is visible rather than dressed as a known one.
 */
export const AGREEMENT_STATUS_TONE: Record<string, StatusTone> = {
  awaiting_parties: "warning",
  in_review: "info",
  approved: "brand",
  paid: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export function agreementStatusTone(status: string): StatusTone {
  return AGREEMENT_STATUS_TONE[status] ?? "neutral";
}
