"use server";

/**
 * The refund desk.
 *
 * /cancellations tells a guest, in plain words, that a paid stay is cancelled
 * by a person rather than by a button, that the published schedule is applied
 * exactly as written, that the money returns to their Vallo wallet, and that
 * they get the amount and the reason in writing. Until this file existed there
 * was no surface on which any person at support could do it, so the published
 * policy and the console disagreed. This is the console's half of that promise.
 *
 * THE FIGURE IS NEVER TYPED. There is no amount field anywhere on this path.
 * The refund is computed by `refundForReason` from lib/trust/cancellation, the
 * same module /cancellations renders its schedule from, against what the guest
 * actually settled. An operator chooses WHY a stay is being cancelled and reads
 * back what that is worth; they never choose HOW MUCH. Three of the four
 * reasons override the schedule upward to a full refund, because the published
 * page says they do. Nothing here can go below the schedule.
 *
 * THE MONEY MOVES AS LEDGER ENTRIES. Not one balance is edited anywhere. The
 * wallet credit, the contra settlement row, the booking transition, the state
 * event, the calendar release and the refund record all happen inside
 * private.refund_and_cancel_booking, in one transaction, keyed on a unique
 * `rm-refund-` reference so a double tap is a no-op rather than a second
 * payment out. That function re-proves the caller's admin role itself and
 * re-bounds the amount against the settled total, so this file is a second
 * check rather than the only one.
 *
 * The audit line and the guest's email happen after that transaction has
 * committed and are both best effort. A failed log line or a failed send must
 * never turn a completed, correct refund into an error an operator cannot act
 * on, and would leave them tempted to run it again.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formatMoney } from "@vallo/i18n";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { bestEffortEmail, sendMessage } from "../email/client";
import { bookingRefunded } from "../email/messages";
import { contactForUser } from "../email/recipients";
import { refundReference } from "../payments/references";
import { createAdminClient } from "../supabase/admin";
import {
  CANCELLATION_REASON_CODES,
  refundForReason,
  type CancellationReason,
} from "../trust/cancellation";
import { writeAudit } from "./audit";
import { adminRefusal, requireAdmin } from "./guard";

const SERVICE_DOWN =
  "The console could not reach the platform data just now. Nothing was cancelled and no money moved. Please try again.";

const GONE = "That booking is no longer there. Refresh the list to see the current state.";

const ALREADY =
  "This stay is already cancelled. Refresh to see the refund that was recorded against it.";

const cancelSchema = z.object({
  bookingId: z.string().uuid("That booking id is not one we recognise."),
  reason: z.enum(CANCELLATION_REASON_CODES, {
    message: "Pick one of the four reasons.",
  }),
  note: z
    .string()
    .trim()
    .max(2000, "Keep the note under 2000 characters.")
    .optional()
    .or(z.literal("")),
});

export type CancelBookingInput = z.infer<typeof cancelSchema>;

/** What the operator is told after the money has moved. */
export type CancelBookingReceipt = {
  refundMinor: number;
  retainedMinor: number;
  paidMinor: number;
  reference: string | null;
};

type RpcCaller = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string | null } | null }>;
};

/** The `status` the database function answered with, or null if it did not. */
function outcomeStatus(data: unknown): string | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const status = (data as Record<string, unknown>).status;
  return typeof status === "string" ? status : null;
}

function outcomeNumber(data: unknown, key: string): number | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

/**
 * The sentence the guest reads about their own money.
 *
 * Written from the reason and the two figures rather than picked from a list,
 * so it cannot describe an outcome different from the one that happened.
 */
function reasonLine(
  reason: CancellationReason,
  refundMinor: number,
  retainedMinor: number,
): string {
  if (reason === "host_cancelled") {
    return "The host cancelled this stay, so everything you paid comes back to you. The schedule never applies to a cancellation you did not choose.";
  }
  if (reason === "not_as_listed") {
    return "A person looked at what you reported about this place and agreed it was not what was listed, so everything you paid comes back to you.";
  }
  if (reason === "no_access") {
    return "A person confirmed you could not get into the property, so everything you paid comes back to you.";
  }
  if (retainedMinor === 0 && refundMinor > 0) {
    return "You cancelled more than 72 hours before check-in, so the published schedule returns the full amount to you.";
  }
  if (refundMinor > 0) {
    return "You cancelled inside the last 72 hours before check-in, so the published schedule returns half to you and the other half stays with the host, whose nights are now very hard to re-let.";
  }
  return "You cancelled on or after check-in day, so the published schedule returns nothing. If you never got in, or the place was not what was listed, reply to support and a person will look at the booking again.";
}

/**
 * Cancel a stay and return what the published schedule says is owed.
 *
 * Safe to call on an unpaid hold: the refund computes to zero against a zero
 * settled total, the stay still cancels, the calendar still reopens and the
 * refund record still says who decided it and why.
 */
export async function cancelBookingAsAdmin(
  input: CancelBookingInput,
): Promise<ActionResult<CancelBookingReceipt | null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(cancelSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { bookingId, reason } = parsed.data;
  const note = parsed.data.note && parsed.data.note.length > 0 ? parsed.data.note : null;

  // Anything more generous than the schedule is a statement about what
  // happened, so it has to carry the sentence that says what was established.
  if (reason !== "guest_choice" && note === null) {
    return fail("Say what was established.", {
      note: "A full refund outside the schedule has to record what a person actually confirmed.",
    });
  }

  // Read through the admin's own RLS-bound client, so Postgres re-proves the
  // role on the read as well as on the write.
  const { data: booking, error: readError } = await access.supabase
    .from("bookings")
    .select("id, listing_id, guest_id, status, check_in, check_out, total_minor")
    .eq("id", bookingId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!booking) return fail(GONE);
  if (booking.status === "CANCELLED") return fail(ALREADY);

  // What actually settled. This is the same sum the database function computes
  // inside the transaction and bounds the refund against, so the figure shown
  // to the operator and the figure that moves cannot disagree.
  const { data: payments, error: paymentsError } = await access.supabase
    .from("transactions")
    .select("amount_minor")
    .eq("booking_id", booking.id)
    .eq("status", "SUCCESSFUL");
  if (paymentsError) return fail(SERVICE_DOWN);

  let paidMinor = 0;
  for (const payment of payments ?? []) paidMinor += payment.amount_minor;

  const outcome = refundForReason(reason, paidMinor, booking.check_in);
  const reference = refundReference();

  let data: unknown = null;
  try {
    const admin = createAdminClient();
    const caller = admin as unknown as RpcCaller;
    const called = await caller.rpc("refund_and_cancel_booking", {
      acting_admin: access.user.id,
      target_booking: booking.id,
      refund_amount: outcome.refundMinor,
      refund_reference: reference,
      reason_code: reason,
      decision_note: note ?? "",
    });
    if (called.error) return fail(SERVICE_DOWN);
    data = called.data;
  } catch {
    return fail(SERVICE_DOWN);
  }

  const status = outcomeStatus(data);
  if (status === "already_cancelled") return fail(ALREADY);
  if (status === "not_found") return fail(GONE);
  if (status === "forbidden") return fail(adminRefusal({ state: "not-admin" }));
  if (status === "over_refund") {
    const settled = outcomeNumber(data, "paid_minor") ?? paidMinor;
    return fail(
      `This stay has ${formatMoney(settled, "en")} settled against it, and the schedule worked out ${formatMoney(outcome.refundMinor, "en")}. Nothing was changed. Refresh and try again, and tell engineering if it happens twice.`,
    );
  }
  if (status === "duplicate") return fail(ALREADY);
  if (status !== "ok") return fail(SERVICE_DOWN);

  const refundMinor = outcomeNumber(data, "refund_minor") ?? outcome.refundMinor;
  const retainedMinor = outcomeNumber(data, "retained_minor") ?? outcome.retainedMinor;
  const settledMinor = outcomeNumber(data, "paid_minor") ?? paidMinor;

  // Everything above committed together or not at all. From here on, nothing
  // may turn a completed refund into an error.
  try {
    const admin = createAdminClient();
    await writeAudit(admin, {
      actorId: access.user.id,
      action: "booking.cancelled_with_refund",
      entityType: "booking",
      entityId: booking.id,
      detail: {
        reason,
        tier: outcome.tier,
        paid_minor: settledMinor,
        refund_minor: refundMinor,
        retained_minor: retainedMinor,
        hours_before_check_in: Math.round(outcome.hoursBeforeCheckIn),
        reference: refundMinor > 0 ? reference : null,
        previous_status: booking.status,
        note,
      },
    });

    // The amount and the reason in writing, which is the published promise.
    await bestEffortEmail(async () => {
      const guest = await contactForUser(admin, booking.guest_id, "bookings");
      if (!guest) return;
      const { data: listing } = await admin
        .from("listings")
        .select("title")
        .eq("id", booking.listing_id)
        .maybeSingle();
      const message = bookingRefunded({
        guestName: guest.name,
        listingTitle: (listing?.title ?? "").trim() || "your stay",
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        paidMinor: settledMinor,
        refundMinor,
        retainedMinor,
        reasonLine: reasonLine(reason, refundMinor, retainedMinor),
        reference: refundMinor > 0 ? reference : null,
      });
      await sendMessage(guest.email, message);
    });
  } catch {
    // The refund is recorded and the money has moved either way.
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${booking.id}`);
  revalidatePath("/bookings");
  revalidatePath("/wallet");

  return ok({
    refundMinor,
    retainedMinor,
    paidMinor: settledMinor,
    reference: refundMinor > 0 ? reference : null,
  });
}

/**
 * What a cancellation would be worth right now, without doing it.
 *
 * The console calls this as the operator changes the reason, so the confirm
 * sheet states the exact kobo before anybody commits to it. It reads only, and
 * it computes through the same `refundForReason` the write path uses, so the
 * figure previewed is the figure that moves.
 */
export async function previewCancellation(input: {
  bookingId: string;
  reason: CancellationReason;
}): Promise<ActionResult<{ paidMinor: number; refundMinor: number; retainedMinor: number }>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(
    z.object({
      bookingId: z.string().uuid("That booking id is not one we recognise."),
      reason: z.enum(CANCELLATION_REASON_CODES, { message: "Pick one of the four reasons." }),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data: booking, error } = await access.supabase
    .from("bookings")
    .select("id, check_in, status")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();
  if (error) return fail(SERVICE_DOWN);
  if (!booking) return fail(GONE);

  const { data: payments, error: paymentsError } = await access.supabase
    .from("transactions")
    .select("amount_minor")
    .eq("booking_id", booking.id)
    .eq("status", "SUCCESSFUL");
  if (paymentsError) return fail(SERVICE_DOWN);

  let paidMinor = 0;
  for (const payment of payments ?? []) paidMinor += payment.amount_minor;

  const outcome = refundForReason(parsed.data.reason, paidMinor, booking.check_in);
  return ok({
    paidMinor,
    refundMinor: outcome.refundMinor,
    retainedMinor: outcome.retainedMinor,
  });
}
