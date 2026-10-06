import type { Dictionary } from "@vallo/i18n/core";

/**
 * THE WORDS A SLIDE-TO-CONFIRM RULING CARRIES, built once on the server from the
 * shared labels and Session 3's console copy, so a client ruling control never
 * reads a dictionary and never invents a label (four locales; money sentences
 * stay in `lib/money/copy.ts`, which a ruling control does not need: it says
 * what the slide does, and the server's own sentence says what happened).
 */
export type RulingWords = {
  slideApprove: string;
  slideReject: string;
  slideRule: string;
  slideReceived: string;
  slideNotReceived: string;
  slidePaid: string;
  confirming: string;
  confirmed: string;
  /** A money slide's keyboard path arms first and says this (DragToConfirm, D49.2). */
  armed: string;
  /** Said if the server refused the ruling. The refusal's own sentence is on the row. */
  error: string;
};

export function rulingWords(t: Dictionary): RulingWords {
  return {
    slideApprove: t.experienceAdmin.money.slideApprove,
    slideReject: t.experienceAdmin.money.slideReject,
    slideRule: t.experienceAdmin.money.slideRule,
    slideReceived: t.experienceAdmin.money.slideReceived,
    slideNotReceived: t.experienceAdmin.money.slideNotReceived,
    slidePaid: t.experienceAdmin.money.slidePaid,
    confirming: t.experienceUi.confirming,
    confirmed: t.experienceUi.confirmed,
    armed: t.experienceUi.pressAgain,
    error: t.experienceAdmin.money.refused,
  };
}
