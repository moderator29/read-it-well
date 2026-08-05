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
  attachMediaSchema,
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
 * The pictures on a post, once the post exists.
 *
 * This is deliberately a second call rather than a field on `dropPost`, and the
 * reason is the object's path. `private.social_media_access` resolves a picture
 * back to its post out of the second folder segment of the object name, so the
 * path has to be `<author>/<post>/<file>` and the post id therefore has to be
 * known before anything is uploaded. The order is: write the post, upload, then
 * this. A database trigger refuses any other shape, so a future surface that
 * gets the order wrong fails loudly rather than storing an unreadable picture.
 *
 * The bytes never come through here. They go straight from the device to the
 * bucket, re-encoded on the way, which is both how the location tag is stripped
 * and how four photographs avoid the one megabyte a server action accepts.
 *
 * No separate rate limit. A picture cannot exist without a post, and posting is
 * already limited at five an hour and twenty a day.
 */
export async function attachPostMedia(input: {
  postId: string;
  items: { path: string; width: number | null; height: number | null }[];
}): Promise<ActionResult<{ attached: number }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(attachMediaSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  /* The same rule the trigger enforces, checked here against the session this
     process actually holds rather than against anything the client said. The
     trigger is the authority; this is so the refusal is a sentence instead of a
     SQLSTATE. */
  const prefix = `${session.user.id}/${parsed.data.postId}/`;
  if (parsed.data.items.some((item) => !item.path.startsWith(prefix))) {
    return fail(POST_FAILURE.pictureUpload);
  }

  const { error } = await session.supabase.from("post_media").insert(
    parsed.data.items.map((item, index) => ({
      post_id: parsed.data.postId,
      storage_path: item.path,
      width: item.width,
      height: item.height,
      position: index,
    })),
  );

  if (error) {
    /* The cap is the database's: `position between 0 and 3`, unique per post.
       Everything else here is a refusal the person cannot act on, so it gets
       the one sentence that is true of all of them. */
    if (error.code === "23514" || error.code === "23505") {
      return fail(POST_FAILURE.pictureTooMany);
    }
    return fail(POST_FAILURE.pictureUpload);
  }

  revalidatePath("/around");
  revalidatePath(`/post/${parsed.data.postId}`);
  return ok({ attached: parsed.data.items.length });
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
 * `posts_update_own` allows an update only on your own post and only while it is
 * LIVE, and its WITH CHECK allows a body change only for fifteen minutes after
 * the post was written. `EDIT_WINDOW_MINUTES` is that number written down for
 * the surface, never the check.
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
 * **Two refusals, two different answers.** The window now lives in WITH CHECK
 * rather than in USING, so a stale edit raises 42501 instead of quietly
 * returning nothing, and a post that is not LIVE returns no row at all. Both
 * were one sentence before, and one of them was the wrong sentence.
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

  /* The WITH CHECK refusal, which is what a stale edit is now. Ahead of the
     shared mapper, because that reads 42501 on this table as "you are not in
     this place", which is true of an insert and never true of this. */
  if (error?.code === "42501") return fail(POST_FAILURE.editWindowClosed);
  if (error) return fail(messageForPostError(error.code, POST_FAILURE.down));
  if (!data || data.length === 0) return fail(POST_FAILURE.editNotLive);

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
 *
 * **There is no window on this any more, and there should never have been one.**
 * Because removal is an update, `posts_update_own` used to apply the fifteen
 * minutes meant for editing to it as well, so a post an hour old could not be
 * taken down by the person who wrote it and the copy sent them to support to
 * ask. Both plans put the window on the edit alone. It matters more now that a
 * post can carry a photograph of the street somebody lives on. The window moved
 * into WITH CHECK, where it can tell an edit from a tombstone, and the database
 * deletes the `post_media` rows as the status lands so the pictures stop being
 * readable by anybody at all.
 *
 * A HELD post still cannot be taken down here, and that is deliberate rather
 * than left over: nobody but its author and a moderator can see it, and it is
 * mid-review. The zero-row answer is that case and it now says so.
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
   * PostgREST answers a policy refusal with an empty set and no error, so this
   * once returned success for a post that was still sitting there: the card
   * vanished from the list and the next refresh brought it back. Asking for the
   * ids back is what turns that silence into a sentence, and the one refusal
   * left is a post that is HELD rather than LIVE.
   *
   * `removed_at` is sent and the database derives its own from the transition,
   * so this line is a courtesy rather than the record.
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
  if (!data || data.length === 0) return fail(POST_FAILURE.deleteWhileHeld);

  revalidatePath("/around");
  revalidatePath(`/post/${parsed.data.postId}`);
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
