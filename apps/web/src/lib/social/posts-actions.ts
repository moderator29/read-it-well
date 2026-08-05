"use server";

/**
 * Around: the write paths for posts.
 *
 * Everything here runs through the caller's own RLS-bound client. Nothing holds
 * the service role, because nothing needs to: the policies already decide who
 * may post, reply, mark, repost and remove, and a security definer path would
 * only be somewhere to get those rules wrong a second time.
 *
 * The database does the work these actions would otherwise duplicate. Depth and
 * root are computed by trigger, the scanner holds a post carrying an account
 * number before it is ever visible, a showcase is refused unless the listing is
 * PUBLISHED and owned by the author, and counters are maintained by trigger. So
 * these functions are thin on purpose: validate, rate limit, insert, and turn a
 * SQLSTATE into one true sentence.
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
  POST_FAILURE,
  POST_LIMITS,
  blockSchema,
  dropPostSchema,
  editPostSchema,
  markSchema,
  muteSchema,
  postIdSchema,
  replySchema,
  reportPostSchema,
  reportProfileSchema,
} from "./posts-schema";
import { SOCIAL_OFF_MESSAGE, isSocialEnabled } from "./flag";

function paced(seconds: number): string {
  return `You have done that a few times already. Try again ${retryIn(seconds)}.`;
}

/**
 * Turn a database refusal into a sentence a person can act on.
 *
 * The custom SQLSTATEs come from the placement trigger, which is the only place
 * that knows why a reply could not be placed. Mapping them here rather than
 * showing a generic failure is the difference between "try again" and "reply
 * higher up so people can follow it".
 */
function messageForPostError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "RM010":
      return POST_FAILURE.gone;
    case "RM011":
      return "You cannot reply to a post that has been removed or held.";
    case "RM012":
      return POST_FAILURE.tooDeep;
    case "RM013":
      return "You can only showcase a listing of your own that is live.";
    case "42501":
      return POST_FAILURE.notInArea;
    case "23514":
      return "That will not post. Check the length and try again.";
    default:
      return fallback;
  }
}

/** Post into a place. */
export async function dropPost(input: {
  areaId: string;
  kind: "GIST" | "ASK";
  body: string;
}): Promise<ActionResult<{ postId: string; held: boolean }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(dropPostSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const subject = subjectForUser(session.user.id);
  for (const limit of [POST_LIMITS.post, POST_LIMITS.postDaily]) {
    const verdict = await consume({ ...limit, subject });
    if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));
  }

  const { data, error } = await session.supabase
    .from("posts")
    .insert({
      area_id: parsed.data.areaId,
      author_id: session.user.id,
      author_kind: "USER",
      kind: parsed.data.kind,
      body: parsed.data.body,
    })
    // status comes back so the composer can tell the truth about what happened
    // rather than saying "posted" for something the scanner has just held.
    .select("id, status")
    .single();

  if (error || !data) {
    return fail(messageForPostError(error?.code, POST_FAILURE.down));
  }

  revalidatePath("/around");
  return ok({ postId: data.id, held: data.status === "HELD" });
}

/** Reply to a post, or to a reply, or to the AI. All the same path. */
export async function replyToPost(input: {
  parentId: string;
  body: string;
}): Promise<ActionResult<{ postId: string; held: boolean }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(replySchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    ...POST_LIMITS.reply,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));

  // area_id, root_id and depth are all filled in by the placement trigger from
  // the parent, so a client cannot claim a depth or move a reply between places.
  const { data, error } = await session.supabase
    .from("posts")
    .insert({
      parent_id: parsed.data.parentId,
      author_id: session.user.id,
      author_kind: "USER",
      kind: "REPLY",
      body: parsed.data.body,
    })
    .select("id, status, root_id")
    .single();

  if (error || !data) {
    return fail(messageForPostError(error?.code, POST_FAILURE.down));
  }

  revalidatePath(`/post/${data.root_id ?? parsed.data.parentId}`);
  return ok({ postId: data.id, held: data.status === "HELD" });
}

/**
 * Like, or save. One toggle for both, because they are the same shape: a row
 * that is either there or not. The current state is read from the database
 * rather than trusted from the client, so a double tap or a stale tab cannot
 * desynchronise it.
 */
export async function toggleMark(input: {
  postId: string;
  mark: "LIKE" | "SAVE";
}): Promise<ActionResult<{ marked: boolean }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(markSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { postId, mark } = parsed.data;

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(POST_FAILURE.signedOutLike);

  const verdict = await consume({
    ...POST_LIMITS.mark,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));

  const { data: existing } = await session.supabase
    .from("post_reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", session.user.id)
    .eq("mark", mark)
    .maybeSingle();

  if (existing) {
    const { error } = await session.supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", session.user.id)
      .eq("mark", mark);
    if (error) return fail(POST_FAILURE.down);
    return ok({ marked: false });
  }

  const { error } = await session.supabase
    .from("post_reactions")
    .insert({ post_id: postId, user_id: session.user.id, mark });

  if (error) {
    // A second tap from a stale tab is not worth an error message.
    if (error.code === "23505") return ok({ marked: true });
    if (error.code === "42501") return fail(POST_FAILURE.gone);
    return fail(POST_FAILURE.down);
  }
  return ok({ marked: true });
}

/** Repost, or undo one. */
export async function toggleRepost(input: {
  postId: string;
}): Promise<ActionResult<{ reposted: boolean }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(postIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    ...POST_LIMITS.repost,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));

  const { data: existing } = await session.supabase
    .from("post_reposts")
    .select("post_id")
    .eq("post_id", parsed.data.postId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await session.supabase
      .from("post_reposts")
      .delete()
      .eq("post_id", parsed.data.postId)
      .eq("user_id", session.user.id);
    if (error) return fail(POST_FAILURE.down);
    return ok({ reposted: false });
  }

  // The area the post came from rides along, so a repost can be attributed to
  // the place it was lifted out of rather than losing that context.
  const { data: post } = await session.supabase
    .from("posts")
    .select("area_id")
    .eq("id", parsed.data.postId)
    .maybeSingle();

  const { error } = await session.supabase.from("post_reposts").insert({
    post_id: parsed.data.postId,
    user_id: session.user.id,
    area_id: post?.area_id ?? null,
  });

  if (error) {
    if (error.code === "23505") return ok({ reposted: true });
    if (error.code === "42501") return fail(POST_FAILURE.gone);
    return fail(POST_FAILURE.down);
  }
  return ok({ reposted: true });
}

/**
 * Change what you wrote, inside the window.
 *
 * Three things the database does here that this file deliberately does not.
 *
 * `posts_update_own` allows an update only on your own post, only while it is
 * LIVE, and only for fifteen minutes after it was written. `EDIT_WINDOW_MINUTES`
 * is that number written down for the surface, never the check.
 *
 * `guard_post_update` sets `edited_at` itself whenever the body changes, and
 * pins every count, every id and `created_at` to their old values. So this
 * writes the body and nothing else: setting `edited_at` from here would be
 * overwritten anyway, and setting anything else would be silently ignored,
 * which is far worse than being refused.
 *
 * `posts_scan` fires on UPDATE as well as INSERT, so an edit that introduces an
 * account number is held exactly as a new post carrying one would be. An edit
 * window with no rescan is a hole straight through moderation, and this one is
 * not that.
 *
 * The zero-row case is the whole reason this returns what it returns. An update
 * the policy refuses is not an error: PostgREST answers with an empty set and no
 * message. Asking for the rows back is the only way to tell "changed" from
 * "silently refused", which is the same trap `removePost` was sitting in.
 */
export async function editPost(input: {
  postId: string;
  body: string;
}): Promise<ActionResult<{ held: boolean }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(editPostSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    ...POST_LIMITS.edit,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));

  const { data, error } = await session.supabase
    .from("posts")
    .update({ body: parsed.data.body })
    .eq("id", parsed.data.postId)
    .eq("author_id", session.user.id)
    .select("id, status");

  if (error) return fail(messageForPostError(error.code, POST_FAILURE.down));
  if (!data || data.length === 0) return fail(POST_FAILURE.editWindowClosed);

  revalidatePath("/around");
  return ok({ held: data[0]?.status === "HELD" });
}

/**
 * Delete your own post.
 *
 * A delete rather than a status change, so the row genuinely goes. Replies
 * survive: `posts.parent_id` cascades, so this would take a whole thread with
 * it, which would delete other people's words. Instead the body is emptied and
 * the status set to REMOVED, leaving a tombstone the thread can hang off.
 *
 * That is why this is an update and not a delete, despite the name. A real
 * delete is only correct for a post nobody has replied to, and checking that
 * first would be a race; the tombstone is right in both cases.
 */
export async function removePost(input: {
  postId: string;
}): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(postIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  /*
   * The rows come back, and that is not decoration.
   *
   * `posts_update_own` gates on `created_at > now() - '00:15:00'`, and removal
   * is an update, so a post older than fifteen minutes cannot be taken down by
   * its own author. PostgREST answers a policy refusal with an empty set and no
   * error, so this used to return success for a post that was still sitting
   * there, the card vanished from the list, and the next refresh brought it
   * back. Proven on the live database under `private.probe_as`: the same update
   * returns 1 row on a fresh post and 0 rows on an hour-old one, which stayed
   * LIVE.
   *
   * Asking for the ids back is what turns that silence into a sentence. The
   * fifteen minute wall on removal is a policy question and it is stated in the
   * handover rather than worked around here.
   */
  const { data, error } = await session.supabase
    .from("posts")
    .update({
      status: "REMOVED",
      body: null,
      payload: null,
      removed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.postId)
    .eq("author_id", session.user.id)
    .select("id");

  if (error) return fail(POST_FAILURE.down);
  if (!data || data.length === 0) return fail(POST_FAILURE.deleteWindowClosed);

  revalidatePath("/around");
  return ok(null);
}

/** Record that a post was seen. Never stores who saw it. */
export async function recordView(input: {
  postId: string;
}): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(postIdSchema, input);
  if (!parsed.ok) return ok(null);

  const session = await resolveSession();
  if (session.state !== "signed-in") return ok(null);

  // We send a post id and nothing else. A BEFORE INSERT trigger computes the
  // viewer bucket from auth.uid() as a salted daily hash, so no identifier ever
  // travels through this call and a client cannot choose, forge or replay one.
  // Yesterday's salt is deleted, which is what makes yesterday's buckets
  // permanently unlinkable to a person.
  //
  // A repeat view on the same day collides on the primary key, which is the
  // point: one person counts once a day, and the collision IS the success. So
  // the error is swallowed rather than reported, and a view is never something
  // a reader has to be told about.
  await session.supabase
    .from("post_views")
    .insert({ post_id: parsed.data.postId } as never);
  return ok(null);
}

/** Report a post into the queue the console already works. */
export async function reportPost(input: {
  postId: string;
  reason: string;
  detail?: string;
}): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(reportPostSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    ...POST_LIMITS.report,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));

  // public.reports.target_type is already text, so a social target needs no
  // migration at all.
  const { error } = await session.supabase.from("reports").insert({
    reporter_id: session.user.id,
    target_type: "POST",
    target_id: parsed.data.postId,
    reason: parsed.data.detail
      ? `${parsed.data.reason}: ${parsed.data.detail}`
      : parsed.data.reason,
  });

  if (error) return fail(POST_FAILURE.down);
  return ok(null);
}

/**
 * Report an account, rather than one thing it wrote.
 *
 * A separate target type, into the same queue the console already works, and
 * deliberately a separate action rather than a mode on `reportPost`. The two
 * carry different ids into different rows, and a single function taking "a post
 * or a person" is exactly the polymorphism the whole data model was designed to
 * avoid.
 *
 * `public.reports.target_type` is already `text`, so this needs no migration.
 * It shares `reportPost`'s rate limit bucket on purpose: twenty reports a day
 * is a person raising real problems, and the way somebody abuses this is by
 * reporting the same account from a menu over and over, which a per-kind budget
 * would happily allow.
 */
export async function reportProfile(input: {
  userId: string;
  reason: string;
  detail?: string;
}): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(reportProfileSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (parsed.data.userId === session.user.id) {
    return fail("You cannot report your own account.");
  }

  const verdict = await consume({
    ...POST_LIMITS.report,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));

  const { error } = await session.supabase.from("reports").insert({
    reporter_id: session.user.id,
    target_type: "SOCIAL_PROFILE",
    target_id: parsed.data.userId,
    reason: parsed.data.detail
      ? `${parsed.data.reason}: ${parsed.data.detail}`
      : parsed.data.reason,
  });

  if (error) return fail(POST_FAILURE.down);
  return ok(null);
}

/** Block somebody. Bidirectional invisibility, and they are never told. */
export async function blockUser(input: {
  userId: string;
}): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(blockSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    ...POST_LIMITS.block,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));

  const { error } = await session.supabase
    .from("blocks")
    .insert({ user_id: session.user.id, other_id: parsed.data.userId });

  if (error && error.code !== "23505") {
    if (error.code === "23514") return fail("You cannot block yourself.");
    return fail(POST_FAILURE.down);
  }

  revalidatePath("/around");
  return ok(null);
}

export async function unblockUser(input: {
  userId: string;
}): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(blockSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const { error } = await session.supabase
    .from("blocks")
    .delete()
    .eq("user_id", session.user.id)
    .eq("other_id", parsed.data.userId);

  if (error) return fail(POST_FAILURE.down);
  revalidatePath("/around");
  return ok(null);
}

/** Mute. One way silence: they are not told, and you stay visible to them. */
export async function muteTarget(input: {
  targetKind: "USER" | "POST" | "AREA";
  targetId: string;
}): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(muteSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const { error } = await session.supabase.from("mutes").insert({
    user_id: session.user.id,
    target_kind: parsed.data.targetKind,
    target_id: parsed.data.targetId,
  });

  if (error && error.code !== "23505") return fail(POST_FAILURE.down);
  revalidatePath("/around");
  return ok(null);
}

export async function unmuteTarget(input: {
  targetKind: "USER" | "POST" | "AREA";
  targetId: string;
}): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(muteSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const { error } = await session.supabase
    .from("mutes")
    .delete()
    .eq("user_id", session.user.id)
    .eq("target_kind", parsed.data.targetKind)
    .eq("target_id", parsed.data.targetId);

  if (error) return fail(POST_FAILURE.down);
  revalidatePath("/around");
  return ok(null);
}
