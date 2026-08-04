"use server";

/**
 * Around: the write paths for places.
 *
 * Four things a person can do here, and every one of them is a real row under
 * the caller's own RLS-bound client. Nothing in this file holds the service
 * role, because nothing in it needs to: the policies already say who may
 * propose, join, leave and apply, and a security definer path would only be a
 * way to get those rules wrong twice.
 *
 * The owner's two rulings live underneath all of this:
 *
 *   1. Anyone may propose a place. Somebody who cannot find a conversation
 *      about Gwagwalada creates one, and we approve it by hand before it is
 *      public. The insert policy pins the status to PROPOSED, so this action
 *      could not create a live area even if it tried.
 *   2. Members apply to look after a place. An approved moderator may hide a
 *      post and may never delete one. Neither this file nor any screen can
 *      grant that role: only an admin action can, and it writes an audit row.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { consume, retryIn, subjectForUser } from "../security/rate-limit";
import {
  AREA_FAILURE,
  AREA_LIMITS,
  areaIdSchema,
  moderatorApplicationSchema,
  proposeAreaSchema,
  slugifyArea,
} from "./areas-schema";

/** One sentence for a limiter refusal, so every action here paces the same way. */
function pacedMessage(seconds: number): string {
  return `You have done that a few times already. Try again ${retryIn(seconds)}.`;
}

/**
 * Suggest a place.
 *
 * Lands as PROPOSED and waits for a person. The slug is derived rather than
 * typed, because a slug somebody chose is a slug somebody will try to squat,
 * and a collision is answered as "already suggested" rather than as a database
 * error, since from the proposer's side those are the same fact.
 */
export async function proposeArea(input: {
  name: string;
  kind: string;
  stateCode: string;
  city: string;
  blurb?: string;
}): Promise<ActionResult<{ slug: string }>> {
  const parsed = validate(proposeAreaSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { name, kind, stateCode, city, blurb } = parsed.data;

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    ...AREA_LIMITS.propose,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(pacedMessage(verdict.retryAfterSeconds));

  const slug = slugifyArea(city, name);
  if (!slug) {
    return fail("That name will not work. Use the name people say out loud.", {
      name: "Use letters and numbers so we can make a web address from it.",
    });
  }

  const { error } = await session.supabase.from("areas").insert({
    slug,
    name,
    kind: kind as "CITY" | "AREA" | "ESTATE" | "CAMPUS",
    state_code: stateCode,
    city,
    blurb: blurb && blurb.length > 0 ? blurb : null,
    status: "PROPOSED",
    created_by: session.user.id,
  });

  if (error) {
    // 23505 is the slug unique index. From where the proposer is standing,
    // "somebody already suggested this" and "it already exists" are one fact.
    if (error.code === "23505") return fail(AREA_FAILURE.duplicate);
    // 23503 is the states foreign key: a state code that is not on our list.
    if (error.code === "23503") {
      return fail("Choose the state from the list.", {
        stateCode: "Pick one of the 36 states or the FCT.",
      });
    }
    return fail(AREA_FAILURE.down);
  }

  revalidatePath("/around");
  return ok({ slug });
}

/**
 * Join a place. The policy allows this only for an ACTIVE area and pins the
 * role to MEMBER, so nobody can insert themselves a moderator badge, which is
 * exactly the kind of thing an insert policy exists to make impossible rather
 * than merely unlikely.
 */
export async function joinArea(input: { areaId: string }): Promise<ActionResult<null>> {
  const parsed = validate(areaIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    ...AREA_LIMITS.join,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(pacedMessage(verdict.retryAfterSeconds));

  const { error } = await session.supabase.from("area_members").insert({
    area_id: parsed.data.areaId,
    user_id: session.user.id,
    role: "MEMBER",
  });

  if (error) {
    // Already a member. A second tap on a stale tab is not an error worth
    // showing, so it is reported as the success it effectively is.
    if (error.code === "23505") {
      revalidatePath("/around");
      return ok(null);
    }
    // 42501 here means the policy refused, which for this insert can only mean
    // the area is not ACTIVE: proposed, paused, archived or gone.
    if (error.code === "42501") return fail(AREA_FAILURE.gone);
    return fail(AREA_FAILURE.down);
  }

  revalidatePath("/around");
  return ok(null);
}

/**
 * Leave a place. Deliberately unthrottled: somebody wanting out of a room is
 * never the abuse case, and putting a limiter in front of leaving would be a
 * dark pattern with a rate limit painted on it.
 */
export async function leaveArea(input: { areaId: string }): Promise<ActionResult<null>> {
  const parsed = validate(areaIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const { error } = await session.supabase
    .from("area_members")
    .delete()
    .eq("area_id", parsed.data.areaId)
    .eq("user_id", session.user.id);

  if (error) return fail(AREA_FAILURE.down);

  revalidatePath("/around");
  return ok(null);
}

/**
 * Apply to look after a place.
 *
 * The insert policy requires membership, so this cannot be used to apply for a
 * place you have never been in. The partial unique index allows exactly one
 * open application per person per place, and a declined one may be applied for
 * again, which is the right shape: a no today is not a no for ever.
 */
export async function applyToModerate(input: {
  areaId: string;
  reason: string;
}): Promise<ActionResult<null>> {
  const parsed = validate(moderatorApplicationSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    ...AREA_LIMITS.moderate,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(pacedMessage(verdict.retryAfterSeconds));

  const { error } = await session.supabase
    .from("area_moderator_applications")
    .insert({
      area_id: parsed.data.areaId,
      user_id: session.user.id,
      reason: parsed.data.reason,
      status: "PENDING",
    });

  if (error) {
    if (error.code === "23505") return fail(AREA_FAILURE.alreadyApplied);
    // The insert policy's membership test is the only other way to be refused.
    if (error.code === "42501") return fail(AREA_FAILURE.notMember);
    if (error.code === "23514") {
      return fail("Tell us a little more about the place.", {
        reason: "Write at least 40 characters so we know what you know.",
      });
    }
    return fail(AREA_FAILURE.down);
  }

  return ok(null);
}

/**
 * Withdraw your own application. The update policy allows a PENDING row owned
 * by the caller to move to WITHDRAWN and to nothing else, so this action cannot
 * be turned into a way to approve yourself.
 */
export async function withdrawModeratorApplication(input: {
  areaId: string;
}): Promise<ActionResult<null>> {
  const parsed = validate(areaIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const { error } = await session.supabase
    .from("area_moderator_applications")
    .update({ status: "WITHDRAWN" })
    .eq("area_id", parsed.data.areaId)
    .eq("user_id", session.user.id)
    .eq("status", "PENDING");

  if (error) return fail(AREA_FAILURE.down);
  return ok(null);
}
