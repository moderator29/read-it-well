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
      "This signs out every other device, holds withdrawals and sends from your wallet for 24 hours, and takes you to change your password.",
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
      "Withdrawals and wallet sends are held until {until}. {ended} Change your password now: until you do, whoever has it can sign in again.",
    alreadyHeldConsequence:
      "Your money was already on hold until {until}; pressing again does not change that. {ended} Change your password now if you have not.",
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
    title: "Withdrawals and sends are on hold",
    body:
      "You told us a sign-in was not you. Until {until}, nothing can leave this wallet by withdrawal or send. Money can still arrive, and you can still pay for a booking or rent inside Vallo.",
    refusal:
      "Withdrawals and sends are on hold until {until} because you told us a sign-in was not you. Nothing has left your wallet.",
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
};
