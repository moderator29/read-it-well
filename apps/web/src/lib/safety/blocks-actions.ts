"use server";

/**
 * Blocking somebody, as a safety control rather than as a social feature.
 *
 * WHY THIS FILE EXISTS AT ALL. `blockUser` and `unblockUser` were written
 * inside `lib/social/posts-actions.ts` and both began with
 * `if (!(await isSocialEnabled())) return fail(SOCIAL_OFF_MESSAGE)`. That is
 * correct for a post, a repost or a mute, and it is wrong for a block: a
 * person being harassed inside a listing conversation was told "the social
 * layer is off" and handed no way to stop it. A SAFETY CONTROL MUST NOT BE
 * SWITCHED OFF BY A FEATURE FLAG FOR A DIFFERENT FEATURE. Messaging has its
 * own flag and the two are not the same flag.
 *
 * The block itself is unchanged and the database is still the wall:
 * `public.blocks` carries bidirectional invisibility, `blocks_insert_own`
 * refuses a row written on somebody else's behalf, the self-block is a check
 * constraint rather than a sentence here, and `lib/messages/blocks.ts`
 * enforces both directions inside messaging. This module is the sentence a
 * person reads; nothing here is the enforcement.
 *
 * `lib/social/posts-actions.ts` re-exports both names, so every existing
 * import keeps working and there is one implementation rather than two.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { consume, retryIn, subjectForUser } from "../security/rate-limit";
import { POST_FAILURE, POST_LIMITS, blockSchema } from "../social/posts-schema";

/*
 * The confirmation copy is `BLOCK_CONFIRM_COPY` in `./blocks-copy.ts`. It
 * cannot live here: a "use server" module may export async functions and
 * nothing else, and a string given an action id is a defect waiting to be
 * called over the wire. The blocked person is told nothing either way, which
 * is the whole design: being told you were blocked is an invitation to open a
 * second account.
 */

/** Block somebody. Bidirectional invisibility, and they are never told. */
export async function blockUserSafely(input: {
  userId: string;
}): Promise<ActionResult<null>> {
  const parsed = validate(blockSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    ...POST_LIMITS.block,
    subject: subjectForUser(session.user.id),
  });
  if (!verdict.allowed) {
    return fail(
      `You have done that a few times already. Try again ${retryIn(verdict.retryAfterSeconds)}.`,
    );
  }

  const { error } = await session.supabase
    .from("blocks")
    .insert({ user_id: session.user.id, other_id: parsed.data.userId });

  if (error && error.code !== "23505") {
    if (error.code === "23514")
      return fail("You cannot block yourself. Your own page is always yours.");
    return fail(POST_FAILURE.down);
  }

  /* Every surface a block changes the shape of. Messaging is revalidated as
     well as the social surfaces, because the thread the person was standing
     in when they pressed it has to close behind them. */
  revalidatePath("/around");
  revalidatePath("/messages");
  return ok(null);
}

/** Undo a block. Settings, Privacy is where this is offered. */
export async function unblockUserSafely(input: {
  userId: string;
}): Promise<ActionResult<null>> {
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
  revalidatePath("/messages");
  /* DB2: the list this is pressed from, and the count on the row leading to it. */
  revalidatePath("/settings/privacy");
  revalidatePath("/settings/privacy/blocked");
  return ok(null);
}
