import type { ResultState } from "@/components/app/ResultSheet";

/**
 * WHAT A SAVED-CARD PAYMENT SAYS AT EVERY MOMENT.
 *
 * BRAND_MARKS section 7 names checkout as the worst pending state in the
 * product and the largest amount of money on the platform: a `loading` prop on
 * a button, no sentence, no amount, no live region. It also names the three
 * things missing from every pending state in the product, even the good ones:
 * a MARK, the AMOUNT, and the CONSEQUENCE, which is the line that removes fear.
 *
 * So this module answers one question for each outcome of `chargeSavedCard`:
 * which of the seven `ResultSheet` states it is, and what the consequence line
 * says. The amount and the mark are then not optional at the call site, because
 * `ResultSheet` already requires a consequence on `pending`, `review` and
 * `failed`, and the fact carries the amount.
 *
 * ---------------------------------------------------------------------------
 * THE THREE RULES THAT ARE NOT STYLE CHOICES.
 *
 * 1. A DECLINE IS NEVER PAINTED IN THE PENDING COLOUR. `--nf-state-warning`
 *    resolves to `--nf-cyan-400`, which is the exact token
 *    `--nf-status-pending` is defined as, and BRAND_MARKS records this page
 *    painting a declined payment in it. `failed` is rose, and rose is the only
 *    thing that may say a payment did not happen.
 *
 * 2. THE 3DS FALLBACK NEVER RETRIES SILENTLY. `chargeSavedCard` cannot present
 *    a challenge, so when the bank insists on one it returns
 *    `needs_hosted_checkout` with the SAME reference. The person is told their
 *    bank wants to check this payment, in those words, and moved there once.
 *    Never a second charge attempt against the saved card: a loop of declines
 *    is how a card gets blocked and a person gets charged twice.
 *
 * 3. NOTHING HERE SAYS "SOMETHING WENT WRONG". A refusal from the server goes
 *    through `vettedFailureSentence` in the checkout's own `payment-copy.ts`
 *    before a reader sees it; what this module supplies is the sentence that
 *    follows it, which is always about the person's money rather than about
 *    our system.
 */

export type SavedCardPhase =
  /** The charge is in flight. Nothing decided. */
  | { kind: "charging" }
  /** Charged on the saved card. Money has moved. */
  | { kind: "charged" }
  /** The bank wants to authenticate. Moving to the hosted page, once. */
  | { kind: "needs_hosted"; authorizationUrl: string }
  /** The attempt failed and nothing was taken. */
  | { kind: "failed"; message: string };

export type SavedCardMoment = {
  state: ResultState;
  /** Two words. Never an exclamation mark. */
  verdict: string;
  /** The line that removes fear. Required on every one of these. */
  consequence: string;
};

/**
 * The moment, for a phase and an amount already formatted by the caller's
 * locale. The amount is passed in rather than formatted here because the only
 * formatter on this platform is `Amount`/`formatMoney`, and a second one in a
 * copy module is how two screens end up writing one figure two ways.
 */
export function savedCardMoment(phase: SavedCardPhase, moneyDisplay: string): SavedCardMoment {
  switch (phase.kind) {
    case "charging":
      return {
        state: "pending",
        verdict: "Taking your payment",
        /* The horizon and the reassurance, in that order. A person watching a
           spinner for their rent money needs to know both that this is normal
           and that nothing is lost if it is not. */
        consequence: `We are charging ${moneyDisplay} to your saved card. This usually takes a few seconds. If it takes longer, your money has not moved and nothing is lost.`,
      };

    case "charged":
      return {
        state: "sent",
        verdict: "Payment sent",
        consequence: `${moneyDisplay} has been charged to your saved card and this booking is confirmed.`,
      };

    case "needs_hosted":
      /*
       * NOT A FAILURE, AND IT MUST NOT READ AS ONE.
       *
       * The bank asking to authenticate is the system working. Painting it rose
       * would tell somebody their payment was declined when it was not, and
       * they would stop rather than finish. `review` is the state for "a check
       * is happening, with a horizon", it is cyan like pending, and its mark
       * differs from pending's so the two are told apart by shape and word
       * rather than by hue.
       */
      return {
        state: "review",
        verdict: "Your bank wants to check this",
        consequence: `Your bank asks to confirm it is really you before ${moneyDisplay} moves. We are taking you to their page now. Nothing has been charged yet and your details have not changed.`,
      };

    case "failed":
      return {
        state: "failed",
        verdict: "Payment not taken",
        /* The caller has already vetted the server's sentence; this is the part
           that is always true and always the reader's first question. */
        consequence: `Nothing has been charged and ${moneyDisplay} is still yours. Your card has not been changed. You can try another way to pay.`,
      };
  }
}
