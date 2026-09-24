/**
 * THE LANDLORD IN THE ROOM, in English. V-31, V-32, V-37 and V-48.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ITS OWN FILE. The same reason `price-check.en.ts` gives: `en.ts`
 * is written by several workers in the same hour, and a namespace kept in its
 * own module touches the contested file with one import and one line.
 *
 * ---------------------------------------------------------------------------
 * WHO READS WHICH HALF.
 *
 * `sms` and `reply` are read by a LANDLORD who has no account, no app and no
 * reason to trust us. Every sentence there says who we are, what we are
 * asking, and what their answer will do, and nothing asks them for anything
 * but the answer. No sentence names a street, a number or anybody's phone.
 *
 * `listing`, `offers` and `rentFact` are read by a RENTER, and each one is a
 * dated fact the database can prove or nothing at all. A null renders no line,
 * never "not confirmed": silence from a landlord is not a negative until the
 * 21 days in the migration have passed, and only then does "Not reconfirmed"
 * appear.
 *
 * `close` is read by a LISTER, and `admin` by the reviewer on the mandate call.
 *
 * ---------------------------------------------------------------------------
 * THE CONSENT SENTENCE IS NOT HERE, deliberately. It is a legal wording that
 * is stored word for word on the mandate row when the principal agrees, so it
 * lives once in `apps/web/src/lib/landlord/consent.ts`, for the same reason
 * the price-check disclaimer lives outside the dictionary: a consent
 * translated four times is four consents, three of which nobody agreed to.
 *
 * The other three locales inherit these through `withFallback`.
 */
export const landlordEn = {
  sms: {
    vacancy:
      "Vallo: is your {place} still available to let? Reply 1 {code} if yes, 2 {code} if it is let, 3 {code} if you have not instructed this agent. Or answer here: {link}",
    rent:
      "Vallo: a tenant has paid {total} for your {place}. Reply 1 {code} if that is right, 2 {code} if it is not what you agreed. Every figure is here: {link}",
  },

  reply: {
    metaTitle: "Your answer to Vallo",
    chip: "For the owner",
    loading: "Opening your question",
    vacancyTitle: "Is your {place} still available?",
    vacancyLedeNoAgent:
      "It is listed to let on Vallo. You are the one person who knows for certain, so we ask you rather than the agent.",
    yes: "Yes, it is still available",
    let: "No, it has been let",
    notInstructed: "I have not instructed this agent",
    whatHappens:
      "If it has been let, every listing of it on Vallo comes down straight away. If you have not instructed this agent, the listing is closed and our team calls you back.",
    rentTitle: "A tenant has paid rent for your {place}",
    rentLedeNoAgent:
      "{total} was paid on Vallo, for a tenancy from {moveIn}. These are the figures the tenant was charged, to the kobo.",
    rows: {
      rent: "Rent",
      caution: "Caution deposit, paid for you",
      service: "Service charge",
      agency: "Agency fee",
      legal: "Legal fee",
      agreement: "Agreement fee",
      total: "Total paid",
      totalSum: "Total paid, the sum of the parts",
    },
    right: "That is right",
    notAgreed: "That is not what I agreed",
    noteLabel: "What did you agree? (optional)",
    noteHint: "Up to 400 characters. Our team reads this before calling you.",
    privacy:
      "Vallo never shows your number to anybody. This page shows the area and never the address.",
    stop: "Stop these messages",
    stopHint: "We will not message this number again, about this property or any other.",
    working: "Sending your answer",
    answeredOn: "You answered on {date}.",
    failed: "Your answer did not reach us. Nothing has changed. Please try again.",
    done: {
      available: {
        title: "Thank you. The listing now shows that you confirmed it",
        body: "Renters see that the owner confirmed it is available today. We will ask again in about two weeks.",
      },
      let: {
        title: "Thank you. It has been taken down",
        body: "Every listing of this property on Vallo came down at once, and anybody waiting on an inspection has been told.",
      },
      notInstructed: {
        title: "Thank you for telling us. The listing has been closed",
        body: "Our team will call you back on this number before anything else happens.",
      },
      confirmed: {
        title: "Thank you. The tenant will see that you confirmed the figures",
        body: "Nothing else is needed from you.",
      },
      disputed: {
        title: "Thank you. Our team will look into it",
        body: "The tenant is told that the figures are questioned, and we will call you back on this number.",
      },
      stopped: {
        title: "We will not message this number again",
        body: "Your listings stay as they are. If you change your mind, tell the agent and our team will call you to ask.",
      },
    },
    states: {
      unknown: {
        title: "We do not recognise this link",
        body: "It may have been copied incompletely. Open it again from the message we sent. Nothing about any property is shown here without a working link.",
      },
      used: {
        title: "You have already answered this one",
        body: "Thank you. Each message can be answered once. We will ask again in the next message.",
      },
      expired: {
        title: "This question has closed",
        body: "It was open for four weeks. Nothing has changed because of it, and we will ask again in the next message.",
      },
      closed: {
        title: "We are not taking answers here at the moment",
        body: "Nothing has changed because of this link. You do not need to do anything.",
      },
      failed: {
        title: "We could not open your question",
        body: "This is on our side, not yours. Nothing has changed. Please try the link again in a few minutes.",
      },
    },
  },

  listing: {
    ownerConfirmedToday: "Owner confirmed available today",
    ownerConfirmedDay: "Owner confirmed available 1 day ago",
    ownerConfirmedDays: "Owner confirmed available {n} days ago",
    notReconfirmed: "Not reconfirmed",
    notReconfirmedBody:
      "The owner has not answered our availability question for three weeks, so this listing is not taking new inspections.",
  },

  offers: {
    title: "{n} offers on this property",
    card: "Offered by {n} agents",
    lede: "Vallo matched these listings to one property. Each lister sets their own move-in total, so compare them here.",
    thisOne: "This listing",
    moveIn: "To move in",
    noMoveIn: "Not stated",
    view: "View offer",
    failed: "The other offers on this property could not be read just now.",
  },

  rentFact: {
    confirmed: "The landlord, {name}, confirmed these figures on {date}",
    confirmedNoName: "The landlord confirmed these figures on {date}",
    waiting: "The landlord has not answered yet",
    waitingBody: "We sent the landlord these figures on {date}.",
    disputed: "The landlord disputes these figures",
    disputedBody: "Our team is looking into it and will contact you.",
  },

  close: {
    action: "Close",
    title: "Close this listing",
    body: "How did it end? A let takes down every listing of the same property, and anybody following it is told.",
    reasons: {
      let_through_vallo: "Let through Vallo",
      let_elsewhere: "Let elsewhere",
      owner_withdrew: "The owner withdrew it",
      mandate_ended: "My mandate ended",
    },
    closedReasons: {
      let_through_vallo: "Let through Vallo",
      let_elsewhere: "Let elsewhere",
      owner_withdrew: "The owner withdrew it",
      mandate_ended: "Mandate ended",
      let_owner_confirmed: "Let, the owner confirmed",
      owner_denied_mandate: "The owner said they did not instruct this listing",
      let_same_property: "Let, through another listing of the same property",
    },
    closedLabel: "Closed: {reason}",
    groupTitle: "Closed",
    groupBlurb: "Closed with a reason. A closed listing stays closed; list the property again as a new listing.",
    confirm: "Close the listing",
    keep: "Keep it open",
    choose: "Choose how it ended.",
    failed: "The listing was not closed. Nothing has changed. Please try again.",
    noRent:
      "No rent has been paid through Vallo for this listing, so it cannot be closed as let through Vallo. Choose Let elsewhere instead.",
  },

  owner: {
    prompt: "Is this still available?",
    body: "You listed it as the owner, so we ask you every two weeks. Answering keeps it in its place in search. Three weeks without an answer moves it to the end of search, and it stops taking inspection requests until you answer. If it has been let, close it instead.",
    yes: "Yes, still available",
    let: "It has been let",
    thanks: "Thank you. We will ask again in about two weeks.",
    failed: "That answer did not reach us. Nothing has changed. Please try again.",
  },

  portfolio: {
    nav: "Buildings",
    metaTitle: "Buildings and mandates",
    title: "Buildings and mandates",
    lede: "The units you own and who is letting them, and owners in your areas choosing an agent.",
    buildingsTitle: "My buildings",
    buildingsLede: "Every unit you list as its owner, grouped by place.",
    let: "Let until {date}",
    letNoDate: "Let",
    achieved: "Achieved {amount} {period}",
    vacant: "Not let",
    alsoListed: "Also listed by {names}",
    mandateTo: "Mandate given to {names}",
    inviteTitle: "Invite agents to pitch",
    inviteLede: "Verified agents who already list in {place} see the unit's place, bedrooms and your asking range, never the address. They answer with a note and their record on Vallo.",
    inviteMin: "Asking from (naira a year)",
    inviteMax: "Asking up to (naira a year)",
    inviteSend: "Invite agents",
    inviteSent: "Invitation sent to {n} agents.",
    inviteSentNone: "Invitation open. No verified agent lists in this place yet; it stays open for two weeks.",
    inviteBand: "Give a range, lowest first, the highest no more than three times the lowest.",
    inviteFailed: "The invitation was not sent. Nothing has changed. Please try again.",
    invitationOpen: "Invitation open · {n} pitches",
    invitationAwarded: "Mandate given · {n} pitches",
    withdraw: "Withdraw the invitation",
    pitchesTitle: "Pitches",
    pitchesNone: "No agent has pitched yet.",
    pitchRecord: "{lets} lets through Vallo · {live} live listings · on Vallo since {since}",
    pitchVerified: "Verified",
    award: "Give this agent the mandate",
    awarded: "Mandate given",
    awardFailed: "That did not go through. Nothing has changed. Please try again.",
    briefsTitle: "Owners choosing an agent",
    briefsLede: "Owners in places you already list in, asking verified agents to pitch. Only verified agents see these.",
    briefLine: "{beds} bedroom {type} in {place}",
    briefBand: "Asking {min} to {max} {period}",
    briefExpires: "Open until {date}",
    pitchLabel: "Why you, in a few lines",
    pitchPlaceholder: "What you have let nearby, how you would market it, how fast you answer.",
    pitchSend: "Send my pitch",
    pitched: "Pitched. The owner will see your record beside your note.",
    youHaveIt: "The owner gave you the mandate. List the unit and attach the mandate with the owner named as principal.",
    pitchShort: "Say a little more: at least ten characters.",
    pitchFailed: "Your pitch did not send. Nothing has changed. Please try again.",
    emptyTitle: "Nothing here yet",
    emptyBody: "Units you list as their owner appear here, and so do owners near you choosing an agent once you are verified.",
    readFailed: "This could not be read just now. Nothing has changed.",
    period: { year: "a year", quarter: "a quarter", month: "a month" },
  },

  admin: {
    consentTitle: "The principal's consent",
    consentRead: "Read this to the principal on the call, word for word:",
    consentGiven: "They agreed",
    consentWithdraw: "They asked us to stop",
    consentRecorded: "Consent recorded {date} by {name}.",
    consentWithdrawn: "Consent withdrawn {date}. Nothing will be sent to this number.",
    consentRecordedNow: "Consent recorded just now, by you.",
    consentWithdrawnNow: "Consent withdrawn just now. Nothing will be sent to this number.",
    consentNone: "No consent recorded. Nothing will ever be sent to this number.",
    consentNoNumber: "No number was given, so there is nobody to ask.",
    consentReadFailed: "Consent could not be read just now. Nothing is sent without it.",
    consentFailed: "Consent was not recorded. Nothing has changed. Try again.",
    lineOff: "The landlord line is switched off, so nothing is sent yet, even with consent.",
    lineOn: "The landlord line is on. With consent, the principal is asked about once a fortnight, never more than once a week.",
    matchTitle: "Same property?",
    matchLede:
      "Listings that may be this same flat, proposed on the owner on record or the pin, and always with the same bedrooms and type. Nothing is joined until you say so.",
    matchNone: "No other listing looks like this property.",
    matchFailed: "Proposed matches could not be read just now.",
    signalPrincipal: "Same owner on record",
    signalDifferent: "Different owner on record",
    closedStays: "A closed listing stays closed. Reopen it only if it was closed by mistake.",
    reopenLabel: "Why is it being reopened? This goes in the audit log.",
    reopen: "Reopen the listing",
    stoppedBefore: "This number asked us to stop on {date}. Record what the principal said on this call before recording consent again.",
    reconsentNote: "What the principal said on this call",
    signalNear: "Pins {m} m apart",
    join: "Same property",
    apart: "Not the same",
    split: "Take this listing off the property",
    onProperty: "This listing is on a property with other offers.",
    decisionFailed: "That decision was not recorded. Nothing has changed.",
  },
};
