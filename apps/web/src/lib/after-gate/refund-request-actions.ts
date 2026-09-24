"use server";

/**
 * V-24. A guest asks for a paid stay to be cancelled and refunded.
 *
 * One insert into `refund_requests` under the guest's own RLS: the insert
 * policy is the whole rule (their booking, paid, not cancelled, not a rent
 * charge, one ask per booking), and the database stamps the time and the
 * due-by so neither can be typed. Nothing moves money here: support decides
 * the refund through the existing desk, and the ask is what the clock
 * measures.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { CANCELLATION_REASON_CODES } from "../trust/cancellation";

const schema = z.object({
  bookingId: z.uuid("That booking could not be identified."),
  reason: z.enum(CANCELLATION_REASON_CODES, { message: "Choose why you are cancelling." }),
  note: z.string().trim().max(1000, "Keep the note under 1,000 characters.").optional(),
});

export async function requestRefund(input: {
  bookingId: string;
  reason: string;
  note?: string;
}): Promise<ActionResult<{ dueBy: string | null }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const loose = session.supabase as unknown as SupabaseClient;
  const { data, error } = await loose
    .from("refund_requests")
    .insert({
      booking_id: parsed.data.bookingId,
      guest_id: session.user.id,
      reason: parsed.data.reason,
      note: parsed.data.note && parsed.data.note.length > 0 ? parsed.data.note : null,
    })
    .select("due_by")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return fail("You have already asked about this stay. Support has the request.");
    return fail("The request did not go through. Nothing has changed; try again.");
  }
  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  const dueBy = data && typeof (data as Record<string, unknown>).due_by === "string"
    ? ((data as Record<string, unknown>).due_by as string)
    : null;
  return ok({ dueBy });
}
