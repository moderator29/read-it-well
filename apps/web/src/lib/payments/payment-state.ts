"use server";

/**
 * "HAS THIS PAYMENT LANDED?", ASKED OF OURSELVES.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS AND WHY IT DOES NOT CALL PAYSTACK.
 *
 * The in-app checkout needs a third signal. `onSuccess` from the popup is a
 * `postMessage` out of a cross-origin iframe and is a hint; the webhook is
 * what actually posts the ledger row, and it is not something a browser can
 * wait on. Between them there is a gap: the iframe was killed, iOS
 * backgrounded the WebView, the network dropped between Pusher and us, and
 * the sheet would spin with nobody coming.
 *
 * So the sheet polls. THE OBVIOUS THING TO POLL IS THE WRONG THING TO POLL.
 * The first version of this called `verifyFunding`, which was already wired
 * for the return from the hosted page and looked like an answer sitting
 * there. It is a round trip to Paystack, it takes the `money_verify`
 * allowance of thirty in ten minutes, and the sheet polls forty-five times in
 * ninety seconds. One in-app payment would have spent the person's entire
 * verification allowance and then been refused mid-poll, which reads on the
 * screen as a payment that failed. A green light in a test would have shown
 * none of that, because a test mocks the processor and never counts.
 *
 * This reads OUR OWN ROWS instead. The reference is unique in both tables it
 * can land in, the caller's own RLS-bound client does the reading, and the
 * answer is one indexed row. Nothing is charged, nothing is verified with
 * anybody, and the reconciliation sweep and the webhook remain the only two
 * things that ever talk to the processor about a settled charge.
 *
 * ---------------------------------------------------------------------------
 * WHAT "PENDING" MEANS HERE, SAID CAREFULLY.
 *
 * `pending` means WE DO NOT KNOW YET, and it is deliberately the answer for
 * every case that is not a settled row: no row at all, a row still PENDING, a
 * reference shape we do not mint, a read that failed. A caller must treat it
 * as "keep waiting, then tell the truth about not knowing", never as "it
 * failed". Money that has moved and been reported as failed is the worst
 * outcome available on this desk, because the person pays a second time.
 */

import { fail, ok, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { guardMoney } from "../security/money-limits";
import { isBookingReference } from "./references";

/**
 * Settled one way, settled the other, or not yet settled.
 *
 * Three words rather than the union of two database enums, because the
 * question the interface is asking is not "what is the row" but "may I stop
 * waiting, and what do I say".
 */
export type PaymentState = "paid" | "failed" | "pending";

/** A polled answer has to be cheap to say no to. */
const UNKNOWN: ActionResult<PaymentState> = { ok: true, data: "pending" };

/**
 * Where a reference has settled, read from our own database.
 *
 * Safe to poll. Safe to call with a reference that is not the caller's: RLS
 * means a row belonging to somebody else simply is not there, and the answer
 * is the same `pending` an unknown reference gets, so this cannot be used to
 * ask whether somebody ELSE has paid.
 */
export async function paymentState(reference: string): Promise<ActionResult<PaymentState>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const ref = (reference ?? "").trim();
  if (ref.length === 0 || ref.length > 200) return UNKNOWN;

  /* Counted, because it is polled. The allowance is generous on purpose: one
     honest payment spends forty-five of them, so this row is sized for three
     payments in ten minutes rather than for a person tapping. */
  const limit = await guardMoney("paymentState", session.user.id);
  if (!limit.allowed) return fail(limit.message);

  if (isBookingReference(ref)) {
    const { data, error } = await session.supabase
      .from("transactions")
      .select("status")
      .eq("provider_ref", ref)
      .maybeSingle();
    if (error || !data) return UNKNOWN;
    if (data.status === "SUCCESSFUL") return ok("paid");
    /* REFUNDED is deliberately not "failed": the money moved and then came
       back, and a checkout panel telling somebody their payment failed when
       it succeeded and was refunded would send them to pay again. */
    if (data.status === "FAILED") return ok("failed");
    return UNKNOWN;
  }

  /* A shape this platform does not mint. Not an error to shout about: an old
     link, a hand-edited URL, a reference from another environment. */
  return UNKNOWN;
}
