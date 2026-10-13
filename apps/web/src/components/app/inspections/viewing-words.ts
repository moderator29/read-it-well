import type { StepSheetWords, TimeSheetWords } from "./ViewingSheets";

/**
 * THE WORDS A VIEWING SAYS ON THE CARD AND ON THE DASHBOARD ROWS.
 *
 * `InspectionSheet` and `InspectionRows` are English-only surfaces, and they
 * used to carry three spellings of one move between them and the thread
 * ("Take that time" here, "Accept this time" there; "It happened" beside
 * "Mark as inspected"). They read one set now, and its English is the
 * thread face's (`threads.rental` in the dictionary), so a lister and a
 * renter see the same word for the same move wherever they meet it.
 *
 * The thread face reads the dictionary for every word it carries, and these
 * for the moves the dictionary does not carry yet (asking before a
 * withdrawal, calling off a booked viewing, moving one). Those are English
 * in every locale until `threads.rental` gains them with their translations.
 */

const KEEP = "Keep it";
/** The one line a decline or a cancel can carry into the renter's notification. */
export const REASON_LABEL = "Tell them why (optional)";
const WHEN = "When you can do it (Lagos time)";
const NOTE = "A line for them, if you want one";

export const VIEWING_WORDS = {
  confirm: "Confirm",
  offerAnother: "Offer another time",
  decline: "Decline",
  acceptTime: "Accept this time",
  withdraw: "Withdraw",
  cancelViewing: "Cancel viewing",
  cancelled: "Cancelled.",
  markInspected: "Mark as inspected",
  openChat: "Open the chat",
  payRent: "Pay the rent",
  lagosTime: "Lagos time",
} as const;

/** Offering a time instead of the one asked for. */
export const PROPOSE_WORDS: TimeSheetWords = {
  title: "Offer another time",
  body: "They will see the time you offer and can take it in one tap. The time they asked for stays on the record.",
  when: WHEN,
  note: NOTE,
  notePlaceholder: "The gate closes at 6, so earlier is better",
  send: "Send this time",
};

/** Moving a viewing that is already booked: it is not confirmed until they take the new time. */
export const RESCHEDULE_WORDS: TimeSheetWords = {
  ...PROPOSE_WORDS,
  body: "The viewing stops being confirmed until they take the new time. They are told straight away, and the time they asked for stays on the record.",
};

export const DECLINE_WORDS: StepSheetWords = {
  title: "Decline this request?",
  body: "They will see that you declined. The chat stays open, so you can still explain.",
  note: REASON_LABEL,
  confirm: "Yes, decline",
  keep: KEEP,
};

export const LISTER_CANCEL_WORDS: StepSheetWords = {
  title: "Cancel this viewing?",
  body: "They will be told the viewing is off. If another day suits you, offer another time instead.",
  note: REASON_LABEL,
  confirm: "Yes, cancel it",
  keep: KEEP,
};

export const WITHDRAW_WORDS: StepSheetWords = {
  title: "Withdraw this request?",
  body: "The lister will see that you withdrew. You can ask again from the listing.",
  confirm: "Yes, withdraw",
  keep: KEEP,
};

/** Saying the other side did not come: the renter, or the lister (or whoever they sent). */
export function noShowWords(otherSide: "requester" | "lister"): StepSheetWords {
  return {
    title: otherSide === "requester" ? "The renter did not come?" : "Nobody came to show it?",
    body:
      (otherSide === "requester"
        ? "They will be told you marked them as a no-show"
        : "The lister will be told you marked them as a no-show") +
      ", and they can dispute it within 48 hours. Vallo looks at every dispute.",
    note: "What happened (optional)",
    confirm: "Yes, mark as a no-show",
    keep: KEEP,
  };
}

export const DISPUTE_WORDS: StepSheetWords = {
  title: "Dispute this no-show?",
  body: "Tell Vallo you were there. Someone on the team will look at both sides and tell you both what they decide.",
  note: "What happened (optional)",
  confirm: "Send the dispute",
  calm: true,
  keep: KEEP,
};

export const NO_SHOW_WORDS = {
  markRenter: "The renter did not come",
  markLister: "Nobody came to show it",
  badge: "No-show",
  dispute: "Dispute this",
} as const;

export const RENTER_CANCEL_WORDS: StepSheetWords = {
  title: "Cancel this viewing?",
  body: "The lister will be told you are not coming. You can ask for another time from the listing.",
  confirm: "Yes, cancel it",
  keep: KEEP,
};
