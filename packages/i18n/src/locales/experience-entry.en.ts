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
};
