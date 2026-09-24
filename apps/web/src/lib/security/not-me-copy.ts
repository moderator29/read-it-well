import type { Dictionary } from "@vallo/i18n";

/**
 * THE "THIS WAS NOT ME" ANSWER, IN WORDS. V-19, with the no-tipping-off rule
 * of the Money Laundering Act (SCUML items 6 and 8).
 *
 * Pure. The hold a member already had is read back as one of three reasons.
 * A `plain` hold (placed by staff after two of them agreed) is described with
 * no cause and NO DATE: its end is years away, and printing it would say what
 * the reason code is careful not to.
 */

export type NotMeHoldReason = "not_me" | "plain" | "other" | null;

export function holdReasonOf(raw: unknown): NotMeHoldReason {
  if (raw === "not_me") return "not_me";
  if (raw === "plain") return "plain";
  return raw ? "other" : null;
}

type NotMeCopy = Dictionary["platform"]["notMe"];

export type NotMeOutcome = {
  holdUntil: string | null;
  holdPlaced: boolean;
  holdExtended: boolean;
  holdReason: NotMeHoldReason;
  rateLimited: boolean;
};

/** The consequence sentence, with {until} and {ended} still to fill. */
export function notMeConsequence(result: NotMeOutcome, copy: NotMeCopy): string {
  const plain = result.holdReason === "plain";
  if (result.rateLimited) {
    if (!result.holdUntil) return copy.rateLimitedNoHold;
    return plain ? copy.rateLimitedHeldPlain : copy.rateLimitedHeld;
  }
  if (result.holdPlaced) return copy.heldConsequence;
  if (result.holdExtended) return copy.extendedConsequence;
  /* Pressing again does not change a hold, and the sentence says whose hold
     it is: the person's own earlier press, a support change, or neither. */
  if (plain) return copy.alreadyHeldPlainConsequence;
  return result.holdReason === "not_me" ? copy.alreadyHeldConsequence : copy.alreadyHeldOtherConsequence;
}
