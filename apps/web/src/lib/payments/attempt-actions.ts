"use server";

/**
 * The payer closed the Paystack window. Close the attempt, if Paystack agrees.
 *
 * Called by the in-app checkout (`components/app/payments/PaystackCheckout`)
 * when Paystack's own `onCancel` fires, or when the window could not start.
 * The browser's word is NOT trusted on its own: this asks Paystack about the
 * reference first and acts only on its answer (`judgeAttempt` with
 * `payerClosed`):
 *
 *   abandoned, or no such transaction   ABANDONED, at once
 *   failed, reversed                    FAILED
 *   success                             settled through the normal return path
 *   still moving, or no usable answer   left PENDING (the sweep asks again)
 *
 * Closing an attempt never makes a payment impossible to record: a charge
 * that completes on an ABANDONED attempt is still settled by the webhook, the
 * return path or the reconciliation, because settlement accepts any attempt
 * that is not SUCCESSFUL or REFUNDED.
 *
 * Only the booking's own guest can close its attempt; a reference that is not
 * a booking charge (a card set up, say) is ignored.
 */

import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { guardMoney } from "../security/money-limits";
import { getAdminClient } from "@/lib/supabase/service";
import { recordMoneyAudit } from "@/lib/money/audit";
import { bookingForReference } from "../bookings/settlement";
import { settleCardPayment } from "../bookings/checkout";
import { isBookingReference } from "./references";
import { currentPaystackMode, isPaystackConfigured } from "./paystack";
import { judgeAttempt, lastOpenedAt } from "./attempt-rules";
import { applyVerdict, askPaystack } from "./attempts";

export type ReleaseOutcome = "abandoned" | "failed" | "paid" | "pending" | "ignored";

export async function releaseCardAttempt(reference: string): Promise<ActionResult<ReleaseOutcome>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const ref = (reference ?? "").trim();
  if (!isBookingReference(ref)) return ok("ignored");
  if (!isPaystackConfigured()) return ok("pending");

  /* The same allowance as the checkout's own status poll: it is one question
     about one reference, asked once per closed window. */
  const limit = await guardMoney("paymentState", session.user.id);
  if (!limit.allowed) return fail(limit.message);

  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);

  let owner: { bookingId: string; guestId: string } | null;
  try {
    owner = await bookingForReference(admin, ref);
  } catch {
    return ok("pending");
  }
  if (!owner || owner.guestId !== session.user.id) return ok("ignored");

  const { data: row } = await admin
    .from("transactions")
    .select("status, created_at, checkout_opened_at, paystack_mode")
    .eq("provider_ref", ref)
    .maybeSingle();
  if (!row) return ok("ignored");
  if (row.status === "SUCCESSFUL" || row.status === "REFUNDED") return ok("paid");
  if (row.status !== "PENDING") return ok(row.status === "FAILED" ? "failed" : "abandoned");

  /* An attempt opened on the other Paystack mode is never judged by this
     key: its "not found" would be about a different account. Left PENDING. */
  if ((row.paystack_mode ?? "live") !== currentPaystackMode()) return ok("pending");

  const { answer } = await askPaystack(ref);
  const verdict = judgeAttempt(answer, { payerClosed: true, openedAt: lastOpenedAt(row), now: Date.now() });

  if (verdict.action === "settle") {
    const settled = await settleCardPayment(ref);
    return ok(settled.ok ? "paid" : "pending");
  }

  let moved = false;
  try {
    moved = await applyVerdict(admin, ref, verdict, { checkoutOpenedAt: row.checkout_opened_at });
  } catch {
    return ok("pending");
  }
  if (verdict.action === "keep") return ok("pending");
  if (moved) {
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId: session.user.id },
      action: verdict.action === "fail" ? "payment.attempt.failed" : "payment.attempt.abandoned",
      reference: ref,
      outcome: verdict.action === "fail" ? "failed" : verdict.reason,
      detail: { processor_status: verdict.processorStatus, source: "payer_closed_window" },
    });
  }
  return ok(verdict.action === "fail" ? "failed" : "abandoned");
}
