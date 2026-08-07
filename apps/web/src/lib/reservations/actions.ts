"use server";

import { revalidatePath } from "next/cache";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession } from "../actions/session";
import { consume, subjectForUser } from "../security/rate-limit";
import { lagosInstant, reserveSchema, respondSchema, whyNotBookable } from "./schema";

/**
 * Asking a restaurant to hold a table, and the restaurant answering.
 *
 * Both writes go through the caller's own RLS-bound client, never the service
 * role. That is not a style preference: `reservations_insert_own` pins
 * `guest_id` to `auth.uid()`, so a forged column cannot put a stranger's name
 * on a table, and `reservations_update_host` scopes a decision to the agent
 * who actually owns the restaurant. Writing as the service role would bypass
 * both and move the entire ownership question into this file, where the next
 * caller would not inherit it.
 *
 * The database is the authority on what is valid. The trigger refuses a
 * reservation against anything that is not a published restaurant and refuses
 * a moment in the past, so those rules hold for the assistant's tool layer and
 * the admin console too. What this file adds is the sentence a person reads:
 * a check constraint says "violates check constraint reservations_party_size",
 * and nobody should ever be shown that.
 */

/** A person may ask for a handful of tables in a few minutes, not a hundred. */
const RESERVE_LIMIT = 6;
const RESERVE_WINDOW_SECONDS = 300;

type Reserved = { reservationId: string; status: "PENDING" };

export async function reserveTable(
  _previous: ActionResult<Reserved> | null,
  formData: FormData,
): Promise<ActionResult<Reserved>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") {
    /* Says what to do next, which `error-copy.spec.mjs` requires of every
       refusal. "Not available yet" tells somebody holding a phone nothing
       they can act on, and this state is a platform without its keys rather
       than anything they did. */
    return fail(
      "Table reservations are not switched on yet. Message the place directly for now, and this will open here once it is live.",
    );
  }
  if (session.state === "signed-out") {
    return fail("Sign in to hold a table.");
  }

  const parsed = validate(reserveSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const at = lagosInstant(parsed.data.date, parsed.data.time);
  if (!at) {
    return fail("That date and time could not be read.", { date: "Pick a real date." });
  }
  const problem = whyNotBookable(at);
  if (problem) return fail(problem, { time: problem });

  const verdict = await consume({
    bucket: "reservation_create",
    subject: subjectForUser(session.user.id),
    limit: RESERVE_LIMIT,
    windowSeconds: RESERVE_WINDOW_SECONDS,
  });
  if (!verdict.allowed) {
    return fail(`That is a lot of tables at once. Try again ${verdict.retryIn}.`);
  }

  const note = parsed.data.note?.trim();
  const { data, error } = await session.supabase
    .from("reservations")
    .insert({
      listing_id: parsed.data.listingId,
      // Pinned by the insert policy as well. Sent explicitly because the column
      // is NOT NULL and the policy checks equality rather than defaulting it.
      guest_id: session.user.id,
      party_size: parsed.data.partySize,
      reserved_for: at.toISOString(),
      ...(note && note.length > 0 ? { note } : {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    /* Told apart only where the difference changes what a person should do.
       23505 is the partial unique index, which means this exact table at this
       exact time is already theirs, and the useful answer is "you already have
       it" rather than "something went wrong". Everything else, including every
       message the trigger raises, is one honest refusal: the detail belongs in
       a log, not in front of a guest. */
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") {
      return fail("You already have a table booked there at that time.");
    }
    return fail("That table could not be held. Check the date and time, and try again.");
  }

  revalidatePath(`/listing/${parsed.data.listingId}`);
  revalidatePath("/bookings");
  return ok({ reservationId: data.id, status: "PENDING" });
}

/**
 * The restaurant accepting or declining.
 *
 * `responded_at` is stamped here rather than by a trigger because it records a
 * decision by a person, and the only place that knows a person just decided is
 * the call they made. The status guard is in the update itself: only a PENDING
 * row moves, so two taps on Accept write once and a decision cannot be reversed
 * by a stale tab.
 */
export async function respondToReservation(
  _previous: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return fail("Sign in to answer a reservation.");
  }

  const parsed = validate(respondSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data, error } = await session.supabase
    .from("reservations")
    .update({
      status: parsed.data.decision,
      responded_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.reservationId)
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();

  if (error) {
    return fail("That answer could not be saved. Try again.");
  }
  if (!data) {
    /* No row moved. Either somebody already answered it, or this caller is not
       the host and the policy hid it. Both get the same sentence, because
       telling a stranger which of the two it was would confirm the reservation
       exists. */
    return fail("That reservation has already been answered.");
  }

  revalidatePath("/agent/bookings");
  revalidatePath("/bookings");
  return ok(null);
}

/**
 * A guest calling off their own table.
 *
 * Separate from the host's decision even though both write CANCELLED, because
 * they are scoped by different policies and mean different things. This one is
 * allowed at any status: somebody who cannot come should be able to say so
 * whether or not the restaurant has answered yet, and a confirmed table nobody
 * releases is a table the restaurant loses.
 */
export async function cancelReservation(
  _previous: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return fail("Sign in to cancel.");
  }

  const id = formDataToObject(formData)["reservationId"] ?? "";
  if (id.length === 0) {
    /* Same rule. A form that arrived without its id is a stale tab or a
       half-loaded page, and reloading is the thing that actually fixes it. */
    return fail("That reservation could not be identified. Reload the page and try cancelling again.");
  }

  const { data, error } = await session.supabase
    .from("reservations")
    .update({ status: "CANCELLED", responded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("guest_id", session.user.id)
    .neq("status", "CANCELLED")
    .select("id")
    .maybeSingle();

  if (error) return fail("That could not be cancelled. Try again.");
  if (!data) return fail("That reservation is already cancelled.");

  revalidatePath("/bookings");
  return ok(null);
}
