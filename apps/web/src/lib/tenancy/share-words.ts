/** V-86. Plain copy for `share-checkout.ts`, which as a "use server" module may export only actions. */

/** The sentence for each reason a share cannot be paid. Exported for tests. */
export const SHARE_NOT_PAYABLE: Record<string, string> = {
  not_found: "We could not find that share on your account.",
  agreement_not_approved: "Payment opens once Vallo approves the agreement for this move-in.",
  not_open: "This move-in can no longer take shares: it has been paid in full, cancelled or refunded.",
  not_accepted: "Accept the share first, then pay it.",
  nothing_owed: "There is nothing left for you to pay on this move-in.",
  already_paid: "Your share is already paid.",
  payee_not_set_up:
    "Payment cannot open yet because the landlord or agent has not finished setting up where they are paid. They have been told.",
  reserve_not_set_up: "Payments are paused while Vallo finishes setting up the Guarantee reserve account. Nothing has been charged.",
};
