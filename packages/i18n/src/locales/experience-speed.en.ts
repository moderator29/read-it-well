/**
 * Session 3's copy for share links, join, briefs, doors, the flip, status tracks, arrival check, after-gate, safety and roles (W13).
 *
 * One module per owner so agents can add strings without editing en.ts at
 * the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 */
export const experienceSpeedEn = {
  /** The refund under a stay, drawn as a document (`BookingMoneyRecord`). */
  afterGate: {
    /** The quiet label above "Your refund" on the paper. */
    overline: "Refund record",
    /** The row label beside a refund's sentence when the amount leads the sheet. */
    where: "Where it stands",
  },
  /**
   * The row that asks a seller or a professional to finish verifying
   * (`components/roles/VerifyPrompt.tsx`). Moved here from the component,
   * word for word, so the four locales can carry it.
   */
  verifyPrompt: {
    headline: "Finish verifying your identity",
    bodyOwner:
      "Your listings stay as drafts until we have confirmed who you are and that the property is yours. It takes about ten minutes.",
    bodyProfessional:
      "Your listings stay as drafts until we have confirmed your identity and your business. It takes about fifteen minutes.",
    action: "Verify now",
  },
  /** The arrival check on a guest's booking (`components/app/arrival-check`). */
  arrivalCheck: {
    /** The label of the dated fact under an answered check. */
    answeredLabel: "Answered",
  },
  /**
   * Reviewing a stay, signed out (`bookings/[bookingId]/review`). Moved here
   * from the page word for word; the link under it carries the review's own
   * address, so "you land straight back here" is true.
   */
  stayReview: {
    signedOutTitle: "Sign in to review your stay",
    signedOutBody: "Reviews are tied to the stay you took, so we need to know it was you. Sign in and you land straight back here.",
    signIn: "Sign in",
  },
};
