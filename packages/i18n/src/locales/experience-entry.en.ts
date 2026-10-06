/**
 * Session 3's copy for auth, the welcome tour and onboarding beyond Get Started (W11).
 *
 * One module per owner so agents can add strings without editing en.ts at
 * the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 */
export const experienceEntryEn = {
  /* The resend clock (`components/auth/ResendClockView.tsx`). `{time}` is the
     real time left until the server's window ends, drawn as a tabular clock. */
  resendWindow: "That is every code we can send for now. You can ask for another in {time}.",
  resendReady: "You can ask for a new code now.",

  /* The offline page (`app/offline/`): one Island, one action, and words that
     say what is happening. It is precached and static, so English. */
  offlineTitle: "No connection",
  offlineBody:
    "Vallo could not reach the network. Your balance, messages and bookings are never shown from an old copy, and anything you had typed but not sent may need typing again.",
  offlineRetry: "Try again",
  offlineStatusOnline: "Your phone reports a connection. Tap Try again.",
  offlineStatusOffline: "Your phone reports no connection right now. We will try again by ourselves when it comes back.",

  /* The code field (`components/auth/CodeInput.tsx`): how far the code has
     got, read by a screen reader with the field's description. */
  codeProgress: "{n} of {total} in",

  /* THE REFUSALS THE AUTH ACTIONS ANSWER WITH (`lib/auth/actions.ts`, U1).
     Each says what went wrong and the one thing to do next; none says
     "invalid credentials", and none says whether an account exists.
     `{when}` is the limiter's own phrase ("in a minute"); `{count}` is a
     numeral. */
  refusals: {
    notConnected: "We cannot reach accounts right now. Nothing you typed was lost. Try again in a minute.",
    tooMany: "Too many attempts just now. Try again {when}.",
    credentials: "That email and password do not match. Check both, or reset your password.",
    unconfirmed: "Confirm your email first. Open the link we sent you, then sign in.",
    taken: "An account already uses that email address. Sign in instead, or reset your password.",
    rateLimited: "Too many attempts just now. Wait a minute, then try again.",
    passwordRefused: "That password was refused. Use at least 8 characters, mixing letters and numbers.",
    generic: "We could not finish that just now, and nothing was changed. Try again in a moment.",
    emailMissing: "Enter your email address.",
    emailTooLong: "That email address is too long. Check it for anything pasted in with it.",
    emailInvalid: "That does not look like an email address. Check it has an @ and a dot.",
    passwordMissing: "Enter your password.",
    passwordShort: "Use at least 8 characters.",
    passwordTooLong: "That password is too long. Use 200 characters or fewer.",
    signUpEmail: "Enter the email address you signed up with.",
    codeShape: "Type the {count} digits from the email we sent you.",
    codeWrong:
      "That code did not work. Type the code from your newest email; your last try is selected, so typing replaces it.",
    resendSent: "If that address is waiting on a code, a new one is on its way. It lasts an hour.",
    resetSent:
      "If that email has an account, a reset link is on its way. It expires in an hour, and it can only be used once.",
    resetBusy: "Too many requests just now. Wait a minute, then try again.",
    resetCodeShape: "Type the {count} digits from the reset email.",
    newPasswordMissing: "Enter a new password.",
    passwordsDiffer: "The two passwords do not match. Type the new one in both fields again.",
    resetLinkSpent:
      "That reset link has expired or was already used. Ask for a new one and open it from the same device.",
    resetLinkOnly:
      "To set a password on this account, ask for a reset link and open it within half an hour. The link is the proof it is you.",
    currentMissing: "Enter your current password.",
    currentWrong: "That is not your current password. Check it and try again.",
  },
};
