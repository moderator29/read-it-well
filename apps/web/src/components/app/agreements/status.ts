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
