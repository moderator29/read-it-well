"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveSession } from "../actions/session";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import type { InspectionState } from "./types";

/**
 * MOVING AN INSPECTION.
 *
 * Four actions and no more: ask, answer, take the time you were offered, pull
 * out. Everything about WHO may do WHICH is decided in the database by
 * `private.guard_inspection_transition`, and nothing here re-implements it.
 *
 * That split is deliberate and it is the same one the money layer uses. A
 * state machine written twice is a state machine that will disagree with
 * itself, and the copy that matters is the one an attacker cannot skip. These
 * functions validate shapes, name the row, and translate a refusal into a
 * sentence somebody can act on.
 *
 * WHAT IS NOT HERE: a confirm action for the requester on their own request.
 * The database refuses that transition; there is no reason for a door in front
 * of a wall.
 */

const MAX_NOTE = 400;

/** The furthest ahead somebody may ask to view a property. */
const MAX_DAYS_AHEAD = 90;

const whenSchema = z
  .string()
  .min(1, "Pick a day and a time.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "That is not a time we can read.")
  .refine((value) => Date.parse(value) > Date.now(), "Pick a time in the future.")
  .refine(
    (value) => Date.parse(value) < Date.now() + MAX_DAYS_AHEAD * 86_400_000,
    `Pick a time within the next ${MAX_DAYS_AHEAD} days.`,
  );

const requestSchema = z.object({
  listingId: z.string().uuid("That property could not be found."),
  when: whenSchema,
  note: z.string().trim().max(MAX_NOTE, `Keep this under ${MAX_NOTE} characters.`).optional(),
});

/**
 * Ask to view a property.
 *
 * The lister is NOT supplied and cannot be: a trigger resolves it from the
 * listing, so a request always names the person who actually owns the property
 * at the moment it is made. The insert policy refuses a request against an
 * unpublished listing and against your own, so neither is checked here.
 */
export async function requestInspection(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = validate(requestSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return fail("Sign in to arrange an inspection.");
  }

  const { data, error } = await session.supabase
    .from("inspection_requests")
    .insert({
      listing_id: parsed.data.listingId,
      requester_id: session.user.id,
      /* Not null in the table and written by the trigger before the row
         lands. Supplying the caller keeps the insert type-complete without
         claiming anything: whatever goes in here is overwritten. */
      lister_id: session.user.id,
      requested_at: new Date(parsed.data.when).toISOString(),
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    /*
     * The two refusals a person can actually do something about, told apart
     * by the constraint that fired rather than by guessing.
     */
    const message = error?.message ?? "";
    if (message.includes("inspection_requests_parties_differ")) {
      return fail("This is your own property, so there is nothing to arrange.");
    }
    if (message.includes("row-level security")) {
      return fail("This property is not taking inspection requests just now.");
    }
    return fail("We could not send that request. Try again in a moment.");
  }

  revalidatePath(`/listing/${parsed.data.listingId}`);
  revalidatePath("/bookings");
  return ok({ id: data.id });
}

const answerSchema = z.object({
  id: z.string().uuid(),
  /* The three answers a lister has. `PROPOSED` needs a time; the others do
     not, and `CONFIRMED` takes the time that was asked for unless one is
     given. */
  state: z.enum(["CONFIRMED", "PROPOSED", "DECLINED"]),
  when: whenSchema.optional(),
  note: z.string().trim().max(MAX_NOTE).optional(),
});

/**
 * The lister's answer: yes, another time, or no.
 *
 * A `CONFIRMED` row must carry a slot - the table refuses one without, because
 * an appointment with no time is not an appointment - so confirming without
 * naming a time takes the time that was asked for, which is what "yes" means.
 */
export async function answerInspection(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(answerSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to answer this request.");

  const existing = await session.supabase
    .from("inspection_requests")
    .select("id, listing_id, requested_at, state")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (existing.error || !existing.data) {
    return fail("We could not find that request.");
  }

  const nextState = parsed.data.state as InspectionState;
  if (nextState === "PROPOSED" && !parsed.data.when) {
    return fail("Say which time you can do.", { when: "Pick a day and a time." });
  }

  const slot =
    nextState === "CONFIRMED"
      ? (parsed.data.when ?? existing.data.requested_at)
      : nextState === "PROPOSED"
        ? parsed.data.when
        : null;

  const { error } = await session.supabase
    .from("inspection_requests")
    .update({
      state: nextState,
      ...(slot ? { slot_at: new Date(slot).toISOString() } : {}),
      ...(parsed.data.note ? { lister_note: parsed.data.note } : {}),
    })
    .eq("id", parsed.data.id);

  if (error) return fail(refusalMessage(error.message));

  revalidatePath("/agent/dashboard");
  revalidatePath("/agent/inspections");
  revalidatePath(`/listing/${existing.data.listing_id}`);
  return ok(null);
}

const takeSchema = z.object({ id: z.string().uuid() });

/**
 * Taking the time the lister offered.
 *
 * The one transition a requester may make into `CONFIRMED`, and only from
 * `PROPOSED`. The slot is already on the row - the lister wrote it when they
 * proposed - so nothing about the time is re-supplied here, which means a
 * requester cannot accept a different time to the one they were offered.
 */
export async function acceptProposedTime(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(takeSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to confirm this time.");

  const { error } = await session.supabase
    .from("inspection_requests")
    .update({ state: "CONFIRMED" })
    .eq("id", parsed.data.id);

  if (error) return fail(refusalMessage(error.message));

  revalidatePath("/bookings");
  return ok(null);
}

const closeSchema = z.object({
  id: z.string().uuid(),
  state: z.enum(["WITHDRAWN", "COMPLETED"]),
});

/**
 * Pulling out, or saying it happened.
 *
 * Withdrawing rather than deleting is the whole reason there is no delete
 * policy on this table: a withdrawn request and a vanished one look the same
 * to the person who was asked, and they mean different things.
 */
export async function closeInspection(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(closeSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to change this request.");

  const { error } = await session.supabase
    .from("inspection_requests")
    .update({ state: parsed.data.state })
    .eq("id", parsed.data.id);

  if (error) return fail(refusalMessage(error.message));

  revalidatePath("/bookings");
  revalidatePath("/agent/dashboard");
  revalidatePath("/agent/inspections");
  return ok(null);
}

/**
 * A database refusal, as a sentence.
 *
 * The guard raises `check_violation` with a message naming the transition. The
 * person on the other end does not need the transition; they need to know that
 * somebody got there first, which is what both of these actually mean in
 * practice: a request answered in another tab, or one the other side closed
 * while this screen was open.
 */
function refusalMessage(raw: string): string {
  if (raw.includes("is finished and cannot change")) {
    return "This request has already been closed. Refresh to see where it ended up.";
  }
  if (raw.includes("illegal inspection transition")) {
    return "That is not something you can do to this request now. Refresh and look again.";
  }
  return "We could not save that. Try again in a moment.";
}
