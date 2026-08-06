"use server";

/**
 * The write paths for stories.
 *
 * A story is its own object, so these are its own actions rather than the post
 * ones wearing a hat. Everything runs through the caller's own row level
 * security bound client; nothing holds the service role, because the policies
 * already decide who may publish, mark, comment and remove.
 *
 * **One insert publishes a story.** `stories.image_path` is `not null`, so the
 * picture is a column rather than a second row, and the rule that a story has a
 * picture is enforced by the column itself. The previous shape needed a
 * deferred constraint trigger that raised at COMMIT, which no write path could
 * see coming; that whole class of failure is gone.
 *
 * Nothing here writes a notification. Follows, likes, comments and every
 * moderation transition fan out from database triggers, and a second
 * application-side path would double every message somebody receives.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { consume, retryIn, subjectForUser } from "../security/rate-limit";
import { POST_LIMITS } from "./posts-schema";
import {
  STORY_FAILURE,
  messageForStoryError,
  storyCommentIdSchema,
  storyCommentSchema,
  storyIdSchema,
  storyInputSchema,
  storyMarkSchema,
} from "./stories-schema";
import { SOCIAL_OFF_MESSAGE, isSocialEnabled } from "./flag";

/* The generated types are regenerated after a migration, not before it, so the
   two disagree for exactly as long as it takes the lead to run the generator.
   Loosened at the call, never across the whole client. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (client: unknown) => client as any;

function paced(seconds: number): string {
  return `You have done that a few times already. Try again ${retryIn(seconds)}.`;
}

/* --------------------------------------------------------------- publishing */

export async function publishStory(input: {
  areaId: string;
  headline: string;
  standfirst?: string;
  placeLabel?: string;
  imagePath: string;
  width?: number;
  height?: number;
}): Promise<ActionResult<{ storyId: string; held: boolean }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(storyInputSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  /* A story is priced like a root post. Writing one is slower and more
     deliberate than a gist, so this never becomes the cheap way past the
     posting limit. */
  const subject = subjectForUser(session.user.id);
  for (const limit of [POST_LIMITS.post, POST_LIMITS.postDaily]) {
    const verdict = await consume({ ...limit, subject });
    if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));
  }

  try {
    const { data, error } = await loose(session.supabase)
      .from("stories")
      .insert({
        author_id: session.user.id,
        area_id: parsed.data.areaId,
        image_path: parsed.data.imagePath,
        headline: parsed.data.headline,
        standfirst: parsed.data.standfirst || null,
        place_label: parsed.data.placeLabel || null,
      })
      /* status comes back so the composer can tell the truth about what
         happened rather than saying "published" for something the scanner has
         just held. */
      .select("id, status")
      .single();

    if (error || !data) return fail(messageForStoryError(error?.code));

    revalidatePath("/around");
    revalidatePath(`/stories/${data.id}`);
    return ok({ storyId: data.id, held: data.status === "HELD" });
  } catch {
    return fail(STORY_FAILURE.down);
  }
}

/* ------------------------------------------------------------------- marking */

/**
 * Like, or save. One toggle for both, because they are the same shape: a row
 * that is either there or not. The current state is read from the database
 * rather than trusted from the client, so a double tap or a stale tab cannot
 * desynchronise it.
 */
export async function toggleStoryMark(input: {
  storyId: string;
  mark: "LIKE" | "SAVE";
}): Promise<ActionResult<{ marked: boolean }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(storyMarkSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { storyId, mark } = parsed.data;

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(STORY_FAILURE.signedOutLike);

  const verdict = await consume({
    ...POST_LIMITS.mark,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));

  try {
    const client = loose(session.supabase);
    const { data: existing } = await client
      .from("story_reactions")
      .select("story_id")
      .eq("story_id", storyId)
      .eq("user_id", session.user.id)
      .eq("mark", mark)
      .maybeSingle();

    if (existing) {
      const { error } = await client
        .from("story_reactions")
        .delete()
        .eq("story_id", storyId)
        .eq("user_id", session.user.id)
        .eq("mark", mark);
      if (error) return fail(messageForStoryError(error.code));
      return ok({ marked: false });
    }

    const { error } = await client
      .from("story_reactions")
      .insert({ story_id: storyId, user_id: session.user.id, mark });

    if (error) {
      /* A second tap from a stale tab is not worth an error message. */
      if (error.code === "23505") return ok({ marked: true });
      return fail(messageForStoryError(error.code));
    }
    return ok({ marked: true });
  } catch {
    return fail(STORY_FAILURE.down);
  }
}

/* ------------------------------------------------------------------ comments */

export async function commentOnStory(input: {
  storyId: string;
  parentId?: string | null;
  body: string;
}): Promise<ActionResult<{ commentId: string; held: boolean }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(storyCommentSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    ...POST_LIMITS.reply,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));

  try {
    const { data, error } = await loose(session.supabase)
      .from("story_comments")
      .insert({
        story_id: parsed.data.storyId,
        parent_id: parsed.data.parentId ?? null,
        author_id: session.user.id,
        body: parsed.data.body,
      })
      .select("id, status")
      .single();

    if (error || !data) return fail(messageForStoryError(error?.code));

    revalidatePath(`/stories/${parsed.data.storyId}`);
    return ok({ commentId: data.id, held: data.status === "HELD" });
  } catch {
    return fail(STORY_FAILURE.down);
  }
}

/** Like a comment, or undo it. */
export async function toggleStoryCommentLike(input: {
  commentId: string;
}): Promise<ActionResult<{ liked: boolean }>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(storyCommentIdSchema, input);
  if (!parsed.ok) return fail(STORY_FAILURE.gone);
  const { commentId } = parsed.data;

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(STORY_FAILURE.signedOutLike);

  const verdict = await consume({
    ...POST_LIMITS.mark,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) return fail(paced(verdict.retryAfterSeconds));

  try {
    const client = loose(session.supabase);
    const { data: existing } = await client
      .from("story_comment_reactions")
      .select("comment_id")
      .eq("comment_id", commentId)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await client
        .from("story_comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", session.user.id);
      if (error) return fail(messageForStoryError(error.code));
      return ok({ liked: false });
    }

    const { error } = await client
      .from("story_comment_reactions")
      .insert({ comment_id: commentId, user_id: session.user.id });
    if (error) {
      if (error.code === "23505") return ok({ liked: true });
      return fail(messageForStoryError(error.code));
    }
    return ok({ liked: true });
  } catch {
    return fail(STORY_FAILURE.down);
  }
}

/* ------------------------------------------------------------------ removal */

/**
 * Take your own story down.
 *
 * A status change, not a delete, so the comments under it keep their place and
 * a link somebody shared lands on a tombstone rather than on nothing. The rows
 * come back so a policy refusal, which PostgREST answers with an empty set and
 * no error, is reported as a refusal rather than as success. That exact silence
 * hid a real bug in the post path.
 */
export async function removeStory(input: {
  storyId: string;
}): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(storyIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  try {
    const { data, error } = await loose(session.supabase)
      .from("stories")
      .update({ status: "REMOVED", removed_at: new Date().toISOString() })
      .eq("id", parsed.data.storyId)
      .eq("author_id", session.user.id)
      .select("id");

    if (error) return fail(messageForStoryError(error.code));
    if (!data || data.length === 0) {
      return fail(
        "That story can no longer be taken down from here. It may have expired or been removed already. Refresh to see your stories.",
      );
    }

    revalidatePath("/around");
    revalidatePath(`/stories/${parsed.data.storyId}`);
    return ok(null);
  } catch {
    return fail(STORY_FAILURE.down);
  }
}

/** Record that a story was seen. Never stores who saw it. */
export async function recordStoryView(input: {
  storyId: string;
}): Promise<ActionResult<null>> {
  if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE);
  const parsed = validate(storyIdSchema, input);
  if (!parsed.ok) return ok(null);

  const session = await resolveSession();
  if (session.state !== "signed-in") return ok(null);

  /* A story id and nothing else. The viewer bucket is a salted daily hash
     computed by a BEFORE INSERT trigger from auth.uid(), so no identifier ever
     travels through this call and a client cannot choose, forge or replay one.
     A repeat view on the same day collides on the primary key, which IS the
     success, so the error is swallowed. */
  try {
    await loose(session.supabase)
      .from("story_views")
      .insert({ story_id: parsed.data.storyId });
  } catch {
    /* A view is never something a reader has to be told about. */
  }
  return ok(null);
}
