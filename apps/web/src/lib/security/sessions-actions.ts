"use server";

/**
 * Ending a session, from the screen that lists them.
 *
 * SEC-5. Two actions and no third, because there are exactly two things a
 * person wants from this screen: throw off the device they do not recognise,
 * or throw off everything except the one in their hand. Both go through
 * SECURITY DEFINER functions that authorise off `auth.uid()` and never off
 * their argument. See `20260809094236` for why that distinction is the whole
 * safety property.
 *
 * ## What these do NOT do, said here because the copy has to say it too
 *
 * Deleting an `auth.sessions` row cascades to its refresh tokens, so the device
 * can never mint another access token: that is the end of it, permanently, and
 * it takes effect the instant the delete commits. The access token the device
 * is ALREADY holding is a signed JWT, and PostgREST verifies a signature rather
 * than looking a session up, so it keeps working until it expires.
 *
 * That gap is real and it is short, and the screen states it rather than
 * implying the button is instant everywhere. Overstating it would be worse than
 * saying nothing: somebody whose phone is genuinely in a thief's hands needs to
 * know that changing the password is the step that ends the current key, and
 * they will not do it if this screen has already told them they are safe.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";

const FAILED_MESSAGE =
  "We could not end that session just now. Nothing has changed. Try again in a moment, and if it keeps failing change your password, which ends every key at once.";

const GONE_MESSAGE =
  "That session is already over. Nothing left to end, and the list below is now up to date.";

const endSessionSchema = z.object({
  sessionId: z.string().uuid("That is not a session on this account."),
});

/*
 * The RPCs are newer than the generated database types, which two other streams
 * are also regenerating. Widened here and the answer validated below, exactly
 * as `sessions.ts` does for the read.
 */
type Loose = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<unknown> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (client: unknown) => client as any as Loose;

type RpcAnswer = { status?: string; ended?: number; was_current?: boolean };

function answerOf(data: unknown): RpcAnswer {
  return data !== null && typeof data === "object" ? (data as RpcAnswer) : {};
}

export type SessionEnded = {
  /** True when the reader has just signed themselves out of this browser. */
  wasCurrent: boolean;
};

export async function endSession(input: unknown): Promise<ActionResult<SessionEnded>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(endSessionSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const { data, error } = (await loose(session.supabase).rpc("end_session", {
      p_session: parsed.data.sessionId,
    })) as { data: unknown; error: unknown };
    if (error) return fail(FAILED_MESSAGE);

    const answer = answerOf(data);
    /*
     * `not_found` covers a session that never existed and one belonging to
     * somebody else, deliberately: the function refuses to distinguish them so
     * it cannot be used to test whether a given session id is live. To the
     * person on this screen both mean the same thing anyway, which is that the
     * row they tapped is gone.
     */
    if (answer.status === "not_found") return fail(GONE_MESSAGE);
    if (answer.status !== "ok") return fail(FAILED_MESSAGE);

    revalidatePath("/settings/devices");
    return ok({ wasCurrent: answer.was_current === true });
  } catch {
    return fail(FAILED_MESSAGE);
  }
}

export type OthersEnded = {
  /** How many sessions were actually ended. Zero is a real, honest answer. */
  ended: number;
};

export async function endOtherSessions(): Promise<ActionResult<OthersEnded>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  try {
    const { data, error } = (await loose(session.supabase).rpc("end_other_sessions")) as {
      data: unknown;
      error: unknown;
    };
    if (error) return fail(FAILED_MESSAGE);

    const answer = answerOf(data);
    if (answer.status !== "ok") return fail(FAILED_MESSAGE);

    revalidatePath("/settings/devices");
    /* Zero is reported rather than smoothed into a success message. "Signed
       out everywhere else" over a list that had nothing else on it is the
       screen telling somebody it did something it did not do. */
    return ok({ ended: typeof answer.ended === "number" ? answer.ended : 0 });
  } catch {
    return fail(FAILED_MESSAGE);
  }
}
