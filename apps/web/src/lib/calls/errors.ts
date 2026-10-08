/**
 * The database answers a refused call operation with a short machine token
 * (`raise exception 'call:blocked'`). This turns each into the sentence a
 * person reads: what happened and what to do, never a code. Client-safe.
 *
 * An unknown token, or an error that is not ours at all, reads as the
 * generic retry line: it never leaks a Postgres message to the screen.
 */

export const CALL_GENERIC_ERROR = "The call did not go through just now. Please try again in a moment.";

const WORDS: Readonly<Record<string, string>> = {
  "call:signed_out": "Sign in to make or answer calls.",
  "call:disabled": "Calls are not available right now. You can keep messaging in the meantime.",
  "call:invalid_kind": CALL_GENERIC_ERROR,
  "call:not_found": "This call is not on your account. Open your messages to see your conversations.",
  "call:invalid_conversation": "Calls are not available in this conversation.",
  "call:blocked": "You cannot call this person. One of you has blocked the other.",
  "call:restricted": "Your account cannot make calls at the moment. Contact support if you think this is a mistake.",
  "call:unavailable": "This person cannot take calls at the moment. You can still message them.",
  "call:not_engaged": "You can call once they have replied in this conversation. Send a message first.",
  "call:caller_busy": "You are already on a call. End it before starting another.",
  "call:rate_limited": "That is more calls than we allow in a short time. Please wait a few minutes and try again.",
  "call:not_yours_to_answer": "Only the person being called can answer.",
  "call:not_yours_to_cancel": "Only the person calling can cancel.",
  "call:no_longer_ringing": "This call is no longer ringing.",
  "call:cannot_cancel": "This call has already been answered or has ended.",
  "call:not_joinable": "This call cannot be joined now. It may have ended.",
  "call:forbidden": "You do not have access to this call.",
  "call:illegal_transition": "This call has already moved on. Refresh to see where it is.",
  "call:append_only": CALL_GENERIC_ERROR,
  "call:provider_unavailable": "Calls are not available right now. Please try again shortly.",
  "review:not_found": "That review call is not available to you.",
  "review:forbidden": "Your role cannot request review calls for this kind of case.",
  "review:invalid_case": "Review calls are not available for this kind of case.",
  "review:case_not_found": "That case could not be found.",
  "review:own_case": "You cannot request a review call about your own case.",
  "review:already_open": "This case already has an open review call. Open it instead of starting another.",
  "review:purpose_required": "Write the reason for the call, between 10 and 500 characters. The person will see it.",
  "review:bad_time": "Choose a time at least a few minutes from now and within the next 30 days.",
  "review:reason_required": "Write a short reason.",
  "review:closed": "This review is already closed.",
  "review:not_accepted": "The person has not accepted the call yet. Schedule a time or wait for their answer.",
  "review:outside_window": "This call can be started from 10 minutes before its time until 30 minutes after.",
  "review:invalid_entry": "That note could not be added. Check the reference and try again.",
  "review:invalid_outcome": "Choose an outcome.",
  "review:summary_required": "Write a short summary of the outcome.",
  "review:follow_up_date_required": "A follow-up outcome needs a due date in the future.",
  "review:invalid_response": CALL_GENERIC_ERROR,
};

/** The token from a database error, or null. `call:not_found` from "call:not_found". */
export function callErrorToken(error: { message?: string | null } | null | undefined): string | null {
  const message = (error?.message ?? "").trim();
  const match = /^(call|review):[a-z_]+$/.exec(message);
  return match ? match[0] : null;
}

/** The sentence for a database error. Always a sentence, never the raw message. */
export function callErrorWords(error: { message?: string | null } | null | undefined): string {
  const token = callErrorToken(error);
  return (token && WORDS[token]) || CALL_GENERIC_ERROR;
}

export function wordsForToken(token: string): string {
  return WORDS[token] ?? CALL_GENERIC_ERROR;
}
