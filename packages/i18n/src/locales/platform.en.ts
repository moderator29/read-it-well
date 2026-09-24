import type { PluralForms } from "../plural";

/**
 * THE PLATFORM AND THE CRAFT, in English: the devices screen and the new
 * sign-in alert (V-19), the wallet hold that alert can place, and the other
 * platform surfaces built beside them.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ITS OWN FILE RATHER THAN A BLOCK INSIDE `en.ts`.
 *
 * The same reason `price-check.en.ts` gives: `en.ts` is nearly six thousand
 * lines and several workers write to it in the same hour, and a namespace in
 * its own module costs the contested file one import and one line.
 *
 * ---------------------------------------------------------------------------
 * THE CLAIMS RULE, APPLIED HERE.
 *
 * Nothing below names a place, and the omission is deliberate. The address on
 * a session is whichever of our servers refreshed its token, so "Lagos" on a
 * security alert would be a confident lie in the one place a person makes a
 * security decision (`lib/security/sessions.ts` gives the full reasoning).
 * Nor does the alert say "just now": it is read later than it is written, and
 * the screen shows the time the device was first seen instead.
 *
 * The other three locales inherit this through `withFallback`; untranslated
 * keys are a copy gap for a speaker to close, not something to paper over by
 * pasting English into `yo.ts`.
 */

const sessionsCount: PluralForms = { one: "{count} session", other: "{count} sessions" };

export const platformEn = {
  devices: {
    /* The folded list. */
    currentTitle: "This device",
    othersTitle: "Everywhere else",
    othersEmpty: "Nothing else is signed in to this account.",
    sessions: sessionsCount,
    firstSignedIn: "First signed in {when}",
    lastUsed: "Last used {when}",
    endGroup: { one: "Sign out this session", other: "Sign out these {count} sessions" } as PluralForms,
    showSessions: "Show each session",
    endedGroup: { one: "1 session is over.", other: "{count} sessions are over." } as PluralForms,
    groupFailed:
      "We could not end those sessions just now. Nothing has changed. Try again, or use Sign out everywhere else.",
    strangerHint:
      "Look for a line you do not recognise, or one that was used when you were not using Vallo. If you find one, sign it out and tap This was not me below.",

    /* The button, on the devices screen and on the alert. */
    notMeTitle: "Something here is not you?",
    notMeBody:
      "This signs out every other device, stops any money leaving your wallet for 24 hours, and takes you to change your password.",
    notMe: "This was not me",
    notMeConfirm: "Tap again to hold your money",
    notMeWorking: "Holding your money",
  },

  alert: {
    screenTitle: "New sign-in",
    heading: "A new device signed in to your account",
    deviceUnnamed: "A device we could not name",
    firstSeen: "First seen {when}",
    question: "Was this you?",
    yes: "Yes, it was me",
    yesNote: "Then there is nothing to do. You can see every device signed in to your account at any time.",
    unknownTitle: "We could not find that sign-in",
    unknownBody:
      "The link may be old, or it belongs to a different account. Every device signed in to your account is on the devices screen, and This was not me is below if you need it.",
    openDevices: "See every device",
  },

  notMe: {
    heldVerdict: "Your money is on hold",
    heldConsequence:
      "No money can leave your wallet until {until}. {ended} Change your password now: until you do, whoever has it can sign in again.",
    extendedConsequence:
      "The hold now lasts until {until}. {ended} Change your password now: until you do, whoever has it can sign in again.",
    alreadyHeldConsequence:
      "Your wallet was already on hold until {until}; pressing again does not change that. {ended} Change your password now if you have not.",
    rateLimited: "You have pressed this several times in the last hour. Your wallet is already protected; try again later if you need to.",
    ended: { one: "We signed out 1 other device.", other: "We signed out {count} other devices." } as PluralForms,
    endedNone: "Nothing else was signed in.",
    changePassword: "Change your password",
    failedVerdict: "Nothing was held",
    failedConsequence:
      "We could not reach the hold just now, so nothing has changed. Try again in a moment. If you think somebody is in your account, sign out everywhere else and change your password.",
    signedOut: "Sign in to use this. It belongs to your account.",
    close: "Close",
  },

  hold: {
    title: "Money cannot leave this wallet for now",
    bodyNotMe:
      "You told us a sign-in was not you. Until {until}, nothing can leave this wallet: no withdrawal, no send, no payment from the balance, and payout accounts cannot be changed. Money can still arrive.",
    bodyOther:
      "The email address on this account was changed with help from support. Until {until}, nothing can leave this wallet: no withdrawal, no send, no payment from the balance, and payout accounts cannot be changed. Money can still arrive.",
    refusalNotMe:
      "No money can leave this wallet until {until}, because you told us a sign-in was not you. Nothing has left your wallet.",
    refusalOther:
      "No money can leave this wallet until {until}, because the email address on this account was changed with help from support. Nothing has left your wallet.",
    refusalUnknown: "No money can leave this wallet while a hold is on it. Nothing has left your wallet.",
  },

  /* V-30: the five kinds of the feedback grammar, as the styleguide names them. */
  feedback: {
    select: "Select",
    selectNote: "A tab, a segment, a chip",
    confirm: "Confirm",
    confirmNote: "An action was accepted",
    success: "Success",
    successNote: "Money settled, a booking confirmed",
    warning: "Warning",
    warningNote: "Pending, or with a person to review",
    error: "Error",
    errorNote: "Refused, declined, reversed",
  },

  /* V-35: the gate handshake and the inspection pack. "Signed in as", never
     "verified": a matching code proves which account's phone is at the gate,
     not what that account has been checked for. */
  gate: {
    title: "Gate code",
    loading: "Getting this inspection ready for the gate",
    ready: "Ready for {day}: works without signal",
    readyNote: "This phone holds what it needs for the gate. It is deleted a day after the inspection.",
    notReady: "The gate code appears here once the inspection is confirmed for a time.",
    expired: "This inspection has passed, so its gate code has been deleted.",
    noPack:
      "This phone has no gate code for this inspection yet. Open this screen once while you have signal and it will work at the gate without any.",
    failed: "We could not get the gate code just now. If this phone already has it, it still works; otherwise try again while you have signal.",

    /* The one who shows it. */
    showHeading: "Show this code at the gate",
    showButton: "Show the code",
    showPrompt: "When the renter is in front of you, show them the code. Showing it is recorded.",
    showBody: "The renter types it into their Vallo app. It changes every 30 seconds and works with no signal on either phone.",
    secondsLeft: { one: "Changes in 1 second", other: "Changes in {count} seconds" } as PluralForms,
    showingFor: "You are showing this for {principal}.",

    /* The one who checks it. */
    checkHeading: "At the gate, ask for their Vallo code",
    checkBody: "Type the six digits their app shows. This works with no signal on either phone.",
    codeLabel: "Their six-digit code",
    check: "Check the code",
    noCode: "They cannot show me a code",
    matchTitle: "The code matches",
    matchBody: "The code matches the one Vallo gave {name} for this inspection.",
    matchDelegate: "The code matches the one Vallo gave {name}, who is showing this inspection for {principal}.",
    mismatchTitle: "That code does not match",
    warning: "This person has not shown you a Vallo code. Do not pay anybody anything.",
    tryAgain: "Check another code",
    unnamed: "the person showing it",
    recorded: "This is recorded when your phone next has signal.",

    /* Naming who shows it. */
    delegateHeading: "Someone else showing it?",
    delegateBody:
      "Ask one person to show this inspection for you. They need a Vallo account with a confirmed phone number, or to be in your firm on Vallo, and they have to say yes. When they do, the code changes and the renter is told to refresh it.",
    delegateLabel: "Their email address on Vallo",
    delegateSave: "Ask them",
    delegateClear: "I will show it myself",
    delegateNamed:
      "We have asked them. Once they say yes they will show this inspection, and the renter will be told to refresh their code.",
    delegateTooLate:
      "It is too close to the inspection to change who shows it; the renter may already be on the way with their code.",
    delegateRateLimited: "You have asked several people in the last hour. Try again later.",
    inviteHeading: "You have been asked to show an inspection",
    inviteBody:
      "{principal} asked you to show an inspection in {place} on {when}. If you say yes, your phone gets the gate code for it, and the renter is told who is coming.",
    inviteAccept: "Yes, I will show it",
    inviteDecline: "No",
    inviteAccepted: "Thank you. Open this again while you have signal before you go, so the code works at the gate.",
    inviteDeclined: "We have told them you will not show it.",
    inviteGone: "This request has ended.",
    delegateCleared: "You are showing this inspection yourself. The code has changed.",
    delegateNotEligible:
      "We cannot name that person. They need a Vallo account with a confirmed phone number, or to be in your firm on Vallo.",
    delegateClosed: "This inspection is closed, so nobody else can be named for it.",
    delegateFailed: "That did not go through. Nothing changed. Try again while you have signal.",

    /* The offline page. */
    offlineHeading: "Your inspections on this phone",
    offlineWhen: "{day} at {time}",
  },

  /* V-53: the buttons a notification carries. Each opens a screen in Vallo;
     none acts from the lock screen, so each says where it goes. */
  pushActions: {
    reply: "Reply",
    answer: "Open inspections",
    openBooking: "Open the booking",
  },

  /* V-77: the shortlist on the phone. MB and dates only; no claim the phone
     cannot prove. */
  shelf: {
    changesTitle: "Since you saved these",
    moveInChanged: "{title}: the move-in total was {was} when you saved it; it is {now} now.",
    priceChanged: "{title}: the price was {was} when you saved it; it is {now} now.",
    rentChanged: "{title}: the rent was {was} when you saved it; it is {now} now.",
    onPhone: "Your shortlist is kept on this phone too, so it opens without signal.",
    offlineHeading: "Your shortlist on this phone",
    storedAt: "Saved on your phone {when}. Prices may have changed.",
    storedToday: "today at {time}",
    storedOn: "on {date}",
    moveIn: "{amount} to move in",
    moveInFrom: "From {amount} to move in",
    rentLine: "Rent {amount}{suffix}",
    priceLine: "{amount}{suffix}",
    noPrice: "No price stated",
    beds: { one: "{count} bed", other: "{count} beds" } as PluralForms,
    baths: { one: "{count} bath", other: "{count} baths" } as PluralForms,
    compare: "Compare",
    compareHint: "Tick up to three to see them side by side.",
    compareClose: "Close the comparison",
    compareMoveIn: "To move in",
    compareRent: "Rent",
    comparePlace: "Area",
    compareRooms: "Rooms",
    comparePower: "Power",
  },

  /* V-79: data saver. Megabytes only, never naira: the price of a megabyte
     depends on the network and the bundle, which the code cannot know. */
  lite: {
    label: "Data saver",
    sub: "Leaves out the decorative artwork and does not load pages before you open them. For small bundles.",
    on: "On",
    off: "Off",
    meterOn: "This week Vallo used about {mb} MB that this phone could measure. Data saver is on.",
    meterOff: "This week Vallo used about {mb} MB that this phone could measure. Data saver is off.",
    welcomeTitle: "Are you usually on mobile data?",
    welcomeSub: "Use less data. You can change this in Settings.",
  },

  /* V-80: the admin desk's field speed panel. */
  fieldSpeed: {
    title: "Field speed",
    lede: "How fast Vallo is on the phones people actually use, from one page view in ten over the last seven days. The 75th percentile: three in four visits were at least this fast.",
    panel: "By route and connection",
    route: "Route",
    connection: "Connection",
    samples: "Samples",
    lcp: "Largest paint",
    inp: "Response to a tap",
    cls: "Layout shift",
    weight: "Page weight",
    unknown: "Not reported",
    emptyTitle: "No samples yet",
    emptyBody: "Phones report their speed as people use the app. Nothing has arrived in the last seven days, so there is nothing to show rather than a guess.",
    what: "the field speed samples",
  },
};
