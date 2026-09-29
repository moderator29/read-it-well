/**
 * History entries that are a STEP INSIDE ONE SCREEN rather than a screen.
 *
 * Two surfaces push entries on their own address so that back means "the
 * previous step" rather than "leave": the welcome slides (`FirstRun`, which
 * stamps `nfGsSlide`) and sign up's second step (`EmailAuthForm`, which
 * stamps `nfStep` and adds `?step=2`). The browser's back already walks those
 * entries. Android's hardware back does not: it asks the route hierarchy,
 * which knows nothing about steps, and at a root such as `/welcome` the
 * hierarchy's answer is "close the app". So `lib/native/back-button.ts` asks
 * this first, and an entry that is a step goes back through history instead.
 *
 * An entry stamped here always has the step it came from directly behind it,
 * because the stamp is only ever written by `pushState` from that step. That
 * is what makes `history.back()` safe on the strength of the stamp alone.
 */

/** The key sign up's step two is stamped with. */
export const STEP_STATE_KEY = "nfStep";

/** The key the welcome slides are stamped with (owned by `FirstRun`). */
const SLIDE_STATE_KEY = "nfGsSlide";

export function isInPageStep(state: unknown): boolean {
  if (!state || typeof state !== "object") return false;
  const record = state as Record<string, unknown>;
  return typeof record[STEP_STATE_KEY] === "number" || typeof record[SLIDE_STATE_KEY] === "number";
}
