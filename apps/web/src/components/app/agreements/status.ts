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

/**
 * D73 (7 October 2026): a booking at a price the business fixed (a stay, a
 * table) pays directly by card, and its agreement is not a deal Vallo's staff
 * review. So a stay's agreement is never DRAWN as "with Vallo for review" or
 * "approved by Vallo", whatever state the record holds: the same states read
 * as the booking being confirmed. Presentation only; the states and their
 * gates are unchanged. A rental keeps its review words.
 */
const STAY_STATUS_LABEL: Record<string, string> = {
  in_review: "Being confirmed",
  approved: "Confirmed: payment is open",
  rejected: "Not confirmed",
};

/** The status in words for this agreement's kind ("rent" keeps the review words). */
export function agreementStatusLabel(status: string, kind: string): string {
  if (kind !== "rent" && STAY_STATUS_LABEL[status]) return STAY_STATUS_LABEL[status]!;
  return AGREEMENT_STATUS_LABEL[status] ?? status;
}

/** The track's step words for a stay, where no staff review step exists. */
export const STAY_TRACK_WORDS = { approved: "Confirmed", sentBack: "Not confirmed" } as const;

export function agreementStatusTone(status: string): StatusTone {
  return AGREEMENT_STATUS_TONE[status] ?? "neutral";
}
