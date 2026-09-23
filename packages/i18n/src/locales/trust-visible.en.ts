/**
 * TRUST MADE VISIBLE, in English: the proof strip, the account-number moment,
 * the truth questions, the fee ratios, the ranking in words, and phone and
 * identity confirmation.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ITS OWN FILE. The reason `price-check.en.ts` gives: `en.ts` is
 * written by several workers in the same hour, and a namespace in its own
 * module costs that file one import and one line.
 *
 * ---------------------------------------------------------------------------
 * THE CLAIMS RULE, APPLIED TO EVERY STRING BELOW. Each sentence states what
 * happened and when, never what that makes the property or the person. No
 * string here says "verified", "safe", "secure" or "guaranteed" about the
 * world; where a check is named, the sentence beside it says what the check
 * is NOT. A null never has a string, because a null renders nothing.
 *
 * Other locales inherit these through `withFallback`, which is the honest
 * state: an untranslated key is a copy gap for a speaker to close.
 */
export const trustVisibleEn = {
  proof: {
    /** The strip's accessible name. */
    label: "What Vallo has on record for this listing",
    /** `{date}` is a formatted date. */
    identitySeen: "The lister's identity document seen by Vallo, {date}",
    identityNimc: "The lister's identity matched with NIMC, {date}",
    ownership: "Title document seen in the lister's name, {date}",
    mandate: "Owner's instruction seen and owner spoken to, {date}",
    availability: "Owner confirmed available, {date}",
    photographs: "Photographed at the property, {date}",
    /** `{count}` renters attended; `{listed}` found the agent and flat as listed. */
    rentersAll: "Inspected by {count} renters on Vallo. All {count} found the agent and the flat as listed.",
    rentersSome: "Inspected by {count} renters on Vallo. {listed} of {count} found the agent and the flat as listed.",
    openHint: "What this check is",
    sheetIs: "What this is",
    sheetIsNot: "What this is not",
    close: "Close",
    explain: {
      identity: {
        is: "A member of Vallo staff looked at a government identity document for the person who listed this, and it matched the application.",
        isNot: "It is not a check of the property, the price, or whether the place is still available. It says who, not whether they will treat you fairly.",
      },
      identityNimc: {
        is: "The lister's National Identification Number was confirmed with NIMC, and the name on it matched the name on their Vallo application.",
        isNot: "It is not a check of the property, the price, or whether the place is still available. Vallo never stores the number itself.",
      },
      ownership: {
        is: "A member of Vallo staff looked at a document in the lister's name for this address, on this date.",
        isNot: "We are not a land registry. It does not say the title is good, that nobody else claims the land, or that the document is still current.",
      },
      mandate: {
        is: "A member of Vallo staff saw a written instruction from the owner to the lister, and spoke to the owner named on it.",
        isNot: "It does not say the instruction is still in force today, or that the owner agreed any particular fee. We are not a land registry.",
      },
      availability: {
        is: "The owner, not the agent, told Vallo on this date that the place was still available.",
        isNot: "It is not a reservation. The place can be let to somebody else after this date.",
      },
      photographs: {
        is: "The photographs were taken through Vallo's camera while standing at this property, on this date.",
        isNot: "It does not say the property looks the same today, or anything about its condition.",
      },
      renters: {
        is: "Renters who booked an inspection through Vallo, and went, answered four short questions afterwards. This counts their answers.",
        isNot: "It is not a review of the flat's condition. Answers are private and counted, never quoted, and nobody is named.",
      },
    },
  },
  /** V-05: the four questions a renter answers after an inspection. */
  truth: {
    title: "Four quick questions",
    lede: "Eight seconds. Your answers are private to Vallo and only ever counted, never shown with your name.",
    questions: {
      agentMatched: "Was the person who showed you the place the agent on Vallo, or someone they named?",
      propertyMatched: "Was it the place in the photos?",
      available: "Is it still available to you?",
      offPlatformAsk: "Did anybody ask you for money outside Vallo?",
    },
    yes: "Yes",
    no: "No",
    notSure: "Not sure",
    submit: "Send my answers",
    sending: "Sending",
    incomplete: "Answer all four, then send.",
    done: "Thank you. Your answers were recorded on {date}.",
    offPlatformNote:
      "Because you were asked for money outside Vallo, a report has been opened for our team with this inspection attached. You do not need to do anything else.",
    failed: "Your answers did not send. Nothing was recorded. Try again.",
    signedOut: "Sign in to answer.",
    notOpen: "These questions open once the agreed time for the inspection has passed.",
    already: "You have already answered for this inspection.",
  },
  /** V-04: the card above an account number, for the person receiving it. */
  account: {
    label: "About the account number in this message",
    checking: "Checking who this account belongs to.",
    belongs:
      "This account belongs to the verified lister. Vallo still cannot protect a payment made to an account.",
    doesNotBelong: "This account does not belong to the person Vallo verified for this listing.",
    /** `{amount}` is formatted money. */
    payLead: "Paying for this place? Pay the move-in total here: {amount}, recorded to the kobo.",
    payButton: "Pay the move-in total",
    requestLead: "Pay only after inspection. Request one here.",
    requestButton: "Request an inspection",
    report: "Report",
    block: "Block",
  },
};
