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
    identitySeenFirm: "The identity document of the person who listed this for the firm seen by Vallo, {date}",
    ownership: "Title document seen in the lister's name, {date}",
    mandate: "Owner's instruction seen and owner spoken to, {date}",
    availability: "Owner confirmed available, {date}",
    photographs: "Photographed at the property, {date}",
    /** `{count}` renters answered; `{listed}` said as listed; `{month}` e.g. "September 2026". */
    rentersAll:
      "{count} renters with a viewing the lister confirmed answered afterwards. All {count} said the agent and the flat were as listed, as of {month}.",
    rentersSome:
      "{count} renters with a viewing the lister confirmed answered afterwards. {listed} of {count} said the agent and the flat were as listed, as of {month}.",
    openHint: "What this check is",
    sheetIs: "What this is",
    sheetIsNot: "What this is not",
    close: "Close",
    explain: {
      identity: {
        is: "A member of Vallo staff looked at a government identity document for the person who listed this, and it matched the application.",
        isNot: "It is not a check of the property, the price, or whether the place is still available. It says who, not whether they will treat you fairly.",
      },
      identityFirm: {
        is: "A member of Vallo staff looked at a government identity document for the person who listed this on the firm's behalf, and it matched their application.",
        isNot: "It is not a check of the firm's registration with the CAC, of the property, the price, or whether the place is still available.",
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
        is: "Different renters whose viewing the lister confirmed through Vallo answered four short questions after the agreed time. Each renter's latest answer counts once, and nothing is shown until five have answered.",
        isNot: "It does not prove they went: Vallo cannot yet see who stood at the gate. It is not a review of the flat's condition, and nobody's answer is quoted or named.",
      },
    },
  },
  /** V-06: Recommended, in words, generated with the constants in `lib/listings/ranking.ts`. */
  ranking: {
    title: "How Recommended is ordered",
    intro:
      "In property search, Recommended counts {count} things about each listing, one point each, and puts the highest count first. Real listings always come before example listings.",
    inputs: {
      costs:
        "Every cost is named: caution, agency, legal and agreement fees on a tenancy; every buying cost, or a stated total to buy, on a sale. A stay priced by the night, or anything priced per head, has nothing more to name, so its price alone earns this point.",
      utilities: "Light and water are answered: how often the power is on, and where the water comes from.",
      photos: "At least {min} photographs of the place.",
      checked: "A person at Vallo has checked the identity of whoever listed it.",
    },
    /** `{ceiling}` is how many of the newest matching listings are ordered. */
    order:
      "Listings with the same count keep the newest first. The order is worked out over the {ceiling} newest listings that match a search.",
    promise: "Nobody can pay to place a property listing higher. Vallo does not sell placement.",
    shelfLine: "Nobody can pay to be higher.",
    shelfLink: "How it works",
  },
  /** V-12: every fee as a share of a year's rent, and the law's number beside it. */
  fees: {
    /** `{share}` is a percentage such as "10.0%". */
    shareOfRent: "{share} of a year's rent",
    /** `{amount}` is money, `{share}` a percentage. */
    toAgent: "Fees to the agent: {amount}, {share} of a year's rent.",
    /** `{state}`, `{agency}`, `{legal}`, `{source}` come from `lib/trust/fee-rules.ts`. */
    stateRule:
      "{state}'s published rule is up to {agency} for the agency fee and up to {legal} for the legal fee, each of a year's rent ({source}).",
    noCap: "Vallo does not cap anybody's fee. It publishes it.",
    sortBasis: "Ordered by the agency, legal and agreement fees together, as a share of a year's rent. Listings that did not state their fees come last.",
  },
  /** V-50: confirming a mobile number with a one-time code. */
  phone: {
    title: "Phone",
    subtitle: "One confirmed mobile number per account",
    why: "Vallo asks for a confirmed mobile number once, before your first inspection request, your first review and your first report. It is never shown to anybody. It keeps one person to one account, which is what makes reviews and reports worth trusting.",
    closedTitle: "Nothing is needed from you",
    closedBody: "Vallo is not asking for phone numbers at the moment. Browsing, saving and messaging never need one.",
    signedOutTitle: "Sign in to confirm your number",
    signedOutBody: "A number is confirmed for an account, so this needs yours.",
    signIn: "Sign in",
    readFailed: "We could not read your phone settings just now. Nothing was changed. Try again in a moment.",
    /** `{last}` is the last four digits, `{date}` a date. */
    confirmed: "Your mobile number ending {last} was confirmed on {date}.",
    change: "Use a different number",
    numberLabel: "Mobile number",
    numberHint: "A Nigerian mobile number. We send a six-digit code to it.",
    send: "Send the code",
    sending: "Sending",
    /** `{number}` is the masked number. */
    sentTo: "We sent a six-digit code to {number}. It expires in 10 minutes.",
    codeLabel: "Code",
    confirm: "Confirm",
    confirming: "Confirming",
    resend: "Send a new code",
    done: "Confirmed. Your number is never shown to anybody.",
  },
  /** V-49: confirming identity with a NIMC virtual NIN. */
  vnin: {
    title: "Confirm with your NIN instead",
    /** `{code}` is Vallo's NIMC merchant code, from configuration. */
    lede: "Dial *346*3*your NIN*{code}# on the phone linked to your NIN, and paste the sixteen-character virtual NIN NIMC sends you. Vallo never stores your NIN.",
    label: "Virtual NIN",
    submit: "Confirm with NIMC",
    checking: "Checking with NIMC",
  },
  /** V-23: the line about the other person under a thread's header. */
  person: {
    label: "About the person in this conversation",
    /** `{date}` is a formatted date. */
    identitySeen: "Identity document seen by Vallo, {date}",
    identityNimc: "Identity matched with NIMC, {date}",
    /** `{month}` is a month and year. */
    memberSince: "On Vallo since {month}",
    phoneConfirmed: "Phone confirmed",
    viewingsOne: "1 viewing arranged on Vallo",
    /** `{count}` is a number. */
    viewingsMany: "{count} viewings arranged on Vallo",
  },
  /** V-59: the tenancy review, led by the door. */
  tenancy: {
    title: "How moving in went",
    lede: "A month in, five questions before any stars. Whether you paid anything more is private: it is counted, never shown with your name.",
    paidExtra: "Did you pay anything to anybody for this place beyond what you paid on Vallo?",
    howMuch: "How much, in naira",
    toWhom: "To whom",
    to: { agent: "The agent", caretaker: "A caretaker", landlord: "The landlord", other: "Somebody else" },
    asListed: "Was the place as listed: the light, the water, the gate?",
    agentOnTime: "Did the agent show up when agreed?",
    again: "Would you rent through this agent again?",
    rating: "Overall, out of five",
    body: "Anything else, in a sentence (optional)",
    yes: "Yes",
    no: "No",
    notSure: "Not sure",
    submit: "Send",
    sending: "Sending",
    incomplete: "Answer every question, then send.",
    done: "Thank you. Your review is recorded.",
    failed: "Your review did not send. Nothing was recorded. Try again.",
    notOpen: "The review opens a month after your move-in date, for the tenant on the rent charge.",
    /** `{date}` is the move-in date. */
    movedIn: "Your move-in date is {date}.",
    already: "You have already reviewed this tenancy.",
    missingTitle: "We could not find that tenancy",
    missingBody: "It may belong to another account. Your inspections and payments are in one place.",
    openInspections: "See your inspections",
    signedOut: "Sign in to review your tenancy.",
    signIn: "Sign in",
    entry: "Tell us how moving in went",
    /** `{count}` tenants who paid nothing more at the door. */
    doorOne: "Moved in for the Vallo price: 1 tenant said nothing more was asked at the door.",
    doorMany: "Moved in for the Vallo price: {count} tenants said nothing more was asked at the door.",
  },
  /** V-21: the agent band on a profile, with no score in it. */
  profile: {
    reviews: "Reviews",
    /** `{rating}` is the average to one decimal, `{count}` the number of reviews. */
    reviewsValue: "{rating} from {count}",
    staysHosted: "Stays hosted",
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
      "Because you said you were asked for money outside Vallo, our team has a report from you about this listing. You do not need to do anything else.",
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
    notOnRecord: "The name on this account is not a name Vallo has on record for this lister.",
    /** `{amount}` is formatted money. */
    payLead: "Paying for this place? Pay the move-in total here: {amount}, recorded to the kobo.",
    payButton: "Pay the move-in total",
    requestLead: "Pay only after inspection. Request one here.",
    requestButton: "Request an inspection",
    report: "Report",
    block: "Block",
  },
};
