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
  type AreaStatus,
} from "./areas-schema";
import { ENTER_FAILURE, ENTER_SQLSTATE, enterPlaceSchema } from "./places-schema";
import { SOCIAL_OFF_MESSAGE, isSocialEnabled } from "./flag";

/**
 * Both Around surfaces.
 *
 * `/around` is the feed, stitched from the places somebody is in, and
 * `/around/manage` is the directory that prints those same places with a Joined
 * control beside them. Anything that changes a membership or a place's status
 * changes both, and revalidating only `/around` was the whole answer for
 * exactly as long as `/around` WAS the directory.
 */
function revalidateAround(): void {
  revalidatePath("/around");
  revalidatePath("/around/manage");
}


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
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
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

  revalidateAround();
  return ok({ slug });
}

/**
 * Walk into a local government.
 *
 * This is the front door of the whole social layer, and it is deliberately not
 * an insert. `public.enter_place` is a security definer function that either
 * hands back the place already standing behind that local government or creates
 * it ACTIVE, in one statement, idempotently. Doing it here as an insert would
 * mean two people tapping Gwagwalada at the same second race each other, and
 * one of them getting a duplicate key error on a navigation.
 *
 * Note what it does NOT do: it does not join you. Membership is a deliberate
 * act with its own button, its own limit and its own row, and writing one off
 * the back of a navigation tap is exactly the kind of silent membership that
 * makes a person distrust a product. You walk in, you read, and you join if you
 * want to speak. The composer says so in as many words.
 *
 * A place somebody paused is returned paused rather than reopened. Reopening is
 * a moderator's decision and walking through a door is not one.
 */
export async function enterPlace(input: {
  lgaCode: string;
}): Promise<ActionResult<{ slug: string; status: AreaStatus }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(enterPlaceSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  /* Generous, because this is navigation and not authorship. It exists so a
     script cannot open all 774 places in a minute, and it is nowhere near what
     a person exploring the country would ever reach. */
  const verdict = await consume({
    ...AREA_LIMITS.enter,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(pacedMessage(verdict.retryAfterSeconds));

  const { data, error } = await session.supabase.rpc("enter_place", {
    p_lga_code: parsed.data.lgaCode,
  });

  if (error) {
    if (error.code === ENTER_SQLSTATE.noSuchLga) return fail(ENTER_FAILURE.noSuchLga);
    /* RM031 is the function's own "created nothing and found nothing". 23505 is
       the same fact arriving from underneath it: the slug this place would take
       is already answered by a place somebody proposed by hand. Both mean a
       human has to look, and both say so. */
    if (error.code === ENTER_SQLSTATE.couldNotOpen) return fail(ENTER_FAILURE.couldNotOpen);
    if (error.code === ENTER_SQLSTATE.slugTaken) return fail(ENTER_FAILURE.couldNotOpen);
    return fail(ENTER_FAILURE.down);
  }

  /* The function returns a set, so supabase-js hands back an array even though
     it can only ever hold one row. */
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return fail(ENTER_FAILURE.down);

  revalidateAround();
  return ok({ slug: row.slug, status: row.status as AreaStatus });
}

/**
 * Join a place. The policy allows this only for an ACTIVE area and pins the
 * role to MEMBER, so nobody can insert themselves a moderator badge, which is
 * exactly the kind of thing an insert policy exists to make impossible rather
 * than merely unlikely.
 */
export async function joinArea(input: { areaId: string }): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
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
      revalidateAround();
      return ok(null);
    }
    // 42501 here means the policy refused, which for this insert can only mean
    // the area is not ACTIVE: proposed, paused, archived or gone.
    if (error.code === "42501") return fail(AREA_FAILURE.gone);
    return fail(AREA_FAILURE.down);
  }

  revalidateAround();
  return ok(null);
}

/**
 * Leave a place. Deliberately unthrottled: somebody wanting out of a room is
 * never the abuse case, and putting a limiter in front of leaving would be a
 * dark pattern with a rate limit painted on it.
 */
export async function leaveArea(input: { areaId: string }): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
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

  revalidateAround();
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
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
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
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
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
