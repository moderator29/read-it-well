import { TERMS_VERSION } from "@/lib/legal/versions";

/**
 * NO ACCOUNT WITHOUT AN AGREEMENT, AND THE SERVER DECIDES IT.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ITS OWN MODULE, AND IT IS THE WHOLE POINT.
 *
 * This rule lived inside `validateSignUp`, a private function in
 * `lib/auth/actions.ts`. That file is `"use server"`, which may export NOTHING
 * that is not an async function, so the rule could not be imported and could
 * not be called by a test. What stood in for a test was this, in
 * `lib/safety/user-generated-content.test.ts`:
 *
 *     expect(form).toContain("{!isSignUp && <p className=\"nf-auth__terms\">");
 *
 * A test that reads a component's MARKUP as text to decide whether the server
 * refuses an account. It fails the moment somebody legitimately rewrites the
 * JSX, which is exactly what happened on 22 September, and it would have
 * passed happily if the markup stayed and the server gate were deleted. It was
 * guarding the most serious safety property on the platform by looking at a
 * string.
 *
 * That is the third time this same shape has been found here. The comment
 * above the rule in `actions.ts` even says so about the test BEFORE it: "The
 * test that was supposed to cover this asserted that `EmailAuthForm.tsx`
 * CONTAINS the string `setAcceptError(true)`. It would pass with the submit
 * never stopped. That is a mirror." The replacement was another mirror.
 *
 * So the rule moves here, where it is a pure function of a `FormData`, and the
 * test calls it. A mirror cannot stand in for a behaviour that can be run.
 *
 * ---------------------------------------------------------------------------
 * WHY THE VERSION AND NOT THE TICK.
 *
 * A tick says only that something was agreed. A version says WHAT was agreed.
 * A stale version is refused for the same reason: somebody sitting on a form
 * opened before the documents changed has not agreed to the documents we would
 * then record against their name.
 *
 * This was enforced in the browser alone once. `EmailAuthForm` called
 * `preventDefault()` when the tick was missing, `AcceptTerms` rendered the
 * hidden field only once ticked, and the form carries `noValidate`, so there
 * was not even a native `required` behind the JavaScript. A request assembled
 * by hand, or a browser running no script, arrived with no version and THE
 * ACCOUNT WAS CREATED.
 */

/**
 * STORE-19: THE TERMS SAY 18 OR OVER, SO SIGN-UP ASKS.
 *
 * The form posts `ageConfirmed=18+` only from a ticked box, and the server
 * refuses an account without it, for the same reason as the version below:
 * a browser check alone is not a check. What is recorded is the person's own
 * statement, beside the terms receipt; nothing here verifies an age.
 */
export const AGE_CONFIRMED_VALUE = "18+";
export const AGE_NOT_CONFIRMED_MESSAGE = "Vallo is for adults. Tick the box to confirm you are 18 or older.";

export function ageConfirmed(submitted: string | null | undefined): boolean {
  return (submitted ?? "").trim() === AGE_CONFIRMED_VALUE;
}

export function ageRefusal(submitted: string | null | undefined): string | null {
  return ageConfirmed(submitted) ? null : AGE_NOT_CONFIRMED_MESSAGE;
}

/** The one message a person sees when the agreement is missing or stale. */
export const TERMS_NOT_ACCEPTED_MESSAGE =
  "Please tick the box to say you agree to the terms, the privacy notice and the rules.";

/**
 * True when this submission carries a current agreement.
 *
 * Takes the raw submitted value rather than a `FormData` so it can be called
 * with anything: a missing field, a whitespace-only field, a stale version.
 */
export function termsAccepted(submitted: string | null | undefined): boolean {
  return (submitted ?? "").trim() === TERMS_VERSION;
}

/**
 * The refusal, or null when the agreement is present and current. Shaped to
 * drop straight into the field-errors object `validateSignUp` builds.
 */
export function termsRefusal(submitted: string | null | undefined): string | null {
  return termsAccepted(submitted) ? null : TERMS_NOT_ACCEPTED_MESSAGE;
}
