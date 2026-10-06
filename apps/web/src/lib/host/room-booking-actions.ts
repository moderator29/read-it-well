"use server";

/**
 * ROOM BOOKINGS 1: the host answers a room request.
 *
 * Accept: PENDING to CONFIRMED. The database then draws up the stay agreement
 * with the business owner (`private.agreement_open_for_stay`); once both sides
 * confirm it and staff approve it, the guest can pay. Decline: PENDING to
 * CANCELLED, and the booking's trigger gives the nights back.
 *
 * Exported server actions are public endpoints: each one checks that the
 * caller owns the hotel the booking is at, through the service role, before
 * writing anything, and the write is guarded by the status it expects.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { createAdminClient } from "../supabase/admin";
import { ensureHostSubaccount } from "../payments/payee-subaccount";
import { hostRefusals } from "./refusals";

/* What the host is told (`experienceHost.refusals.roomRequests`), read per
   call. The note written into `booking_state_events` below stays English: it
   is a stored record, not a sentence said to this host. */
type Words = Awaited<ReturnType<typeof hostRefusals>>["roomRequests"];

const answerSchema = (w: Words) =>
  z.object({
    bookingId: z.string().uuid(w.requestUnknown),
    reason: z.string().trim().max(500, w.reasonTooLong).optional(),
  });

type Owned = { id: string; status: string };

async function ownedRequest(bookingId: string, userId: string): Promise<Owned | "not-yours" | "down"> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .select("id, status, accommodation_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) return "down";
  const row = data as { id: string; status: string; accommodation_id: string | null } | null;
  if (!row || !row.accommodation_id) return "not-yours";
  const { data: place } = await admin
    .from("accommodations")
    .select("id, businesses!inner(owner_id)")
    .eq("id", row.accommodation_id)
    .maybeSingle();
  const owner = (place as { businesses?: { owner_id?: string } } | null)?.businesses?.owner_id;
  return owner === userId ? { id: row.id, status: row.status } : "not-yours";
}

async function answer(
  input: unknown,
  to: "CONFIRMED" | "CANCELLED",
): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const w = (await hostRefusals()).roomRequests;
  const parsed = validate(answerSchema(w), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const owned = await ownedRequest(parsed.data.bookingId, session.user.id);
  if (owned === "down") return fail(w.down);
  if (owned === "not-yours") return fail(w.notYours);
  if (owned.status !== "PENDING") return fail(w.movedOn);

  const admin = createAdminClient();
  const { data: moved, error } = await admin
    .from("bookings")
    .update({ status: to })
    .eq("id", owned.id)
    .eq("status", "PENDING")
    .select("id");
  if (error) return fail(w.down);
  if (!moved || moved.length === 0) return fail(w.movedOn);

  await admin.from("booking_state_events").insert({
    booking_id: owned.id,
    from_status: "PENDING",
    to_status: to,
    actor_id: session.user.id,
    note:
      to === "CONFIRMED"
        ? "The hotel accepted the room request."
        : `The hotel declined the room request.${parsed.data.reason ? ` ${parsed.data.reason}` : ""}`,
  } as never);

  /* The guest pays once the agreement is approved; make sure the host's share
     has a subaccount to land in (best effort, never blocks the answer). */
  if (to === "CONFIRMED") await ensureHostSubaccount(admin, session.user.id);

  revalidatePath("/host/bookings");
  return ok(null);
}

/** The host accepts a room request. */
export async function acceptRoomRequest(bookingId: string): Promise<ActionResult<null>> {
  return answer({ bookingId }, "CONFIRMED");
}

/** The host declines a room request; the nights go back on sale. */
export async function declineRoomRequest(bookingId: string, reason?: string): Promise<ActionResult<null>> {
  return answer({ bookingId, reason }, "CANCELLED");
}
