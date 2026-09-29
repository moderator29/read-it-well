"use server";

/**
 * "THIS WAS NOT ME", AND ENDING A WHOLE LINE OF THE DEVICES SCREEN. V-19.
 *
 * Both actions refuse with a SENTENCE from the dictionary, in the reader's
 * language (`platform.notMe` and `platform.devices` in `platform.en.ts`), and
 * every one of them says what to do next. They used to refuse with a bare code
 * ("signed-out", "unconfigured") for the screen to map, which put a raw code in
 * the one envelope whose rule is that a reader never meets one (E2E audit L-2,
 * 29 September 2026). The screen now shows the sentence it is given.
 *
 * `reportNotMe` calls `public.report_not_me()`, which authorises off
 * `auth.uid()` and nothing else: it ends every OTHER session, writes a 24-hour
 * `not_me` row into the audit's `account_money_holds` (lengthened, to 72
 * hours at most, only when pressed from a session older than the hold), and
 * writes an audit row. What it
 * cannot do is change the password, because the password is the one thing
 * the server must never choose for somebody. So the answer carries the
 * instruction to do it now and the screen routes straight to the form.
 *
 * `endSessionGroup` ends the sessions of one folded line, one RPC per
 * session, through the same `end_session` door the per-row button uses, so it
 * can end nothing that door could not. The fold never puts the current
 * session in a group (`session-groups.ts`); a hand-made request that included
 * it would sign the sender out of their own browser, which is theirs to do.
 */

import { holdReasonOf } from "./not-me-copy";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession } from "../actions/session";
import { getDictionary, type Dictionary } from "@vallo/i18n";
import { getLocale } from "../locale";

type Loose = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<unknown> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (client: unknown) => client as any as Loose;

/** Why an action refused. Never sent to the reader; `refusal` turns it into a sentence. */
export type DeviceAlertError = "signed-out" | "unconfigured" | "failed" | "invalid";

/** The sentence for a refusal: sign in when signed out, otherwise nothing changed, try again. */
async function refusal<T>(code: DeviceAlertError, failed: (t: Dictionary) => string): Promise<ActionResult<T>> {
  const t = getDictionary(await getLocale().catch(() => "en" as const));
  return fail(code === "signed-out" ? t.platform.notMe.signedOut : failed(t));
}
const notMeFailed = (t: Dictionary) => t.platform.notMe.failedConsequence;
const groupFailed = (t: Dictionary) => t.platform.devices.groupFailed;

export type NotMeResult = {
  /** How many other sessions were ended. Zero is an honest answer. */
  ended: number;
  /** ISO 8601. When withdrawals and sends open again; null when no hold stands. */
  holdUntil: string | null;
  /** False when a hold was already in force and this press did not add one. */
  holdPlaced: boolean;
  /** True when a press from an older session lengthened a hold already in force. */
  holdExtended: boolean;
  /** Why the hold that stands was placed: this person's own press, or support. */
  holdReason: "not_me" | "plain" | "other" | null;
  /** The press signed everything else out, but the hourly limit left the hold alone. */
  rateLimited: boolean;
};

export async function reportNotMe(): Promise<ActionResult<NotMeResult>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return refusal("unconfigured", notMeFailed);
  if (session.state === "signed-out") return refusal("signed-out", notMeFailed);

  try {
    const { data, error } = (await loose(session.supabase).rpc("report_not_me")) as {
      data: unknown;
      error: unknown;
    };
    if (error || !data || typeof data !== "object") return refusal("failed", notMeFailed);
    const answer = data as {
      status?: unknown;
      ended?: unknown;
      hold_until?: unknown;
      hold_placed?: unknown;
      hold_extended?: unknown;
      hold_reason?: unknown;
      rate_limited?: unknown;
    };
    const rateLimited = answer.rate_limited === true;
    if (answer.status !== "ok") return refusal("failed", notMeFailed);
    /* A hold carries its end, except when the limit was hit with no hold in
       force, or when the hold sits beside one the member is never told about
       (SCUML items 6 and 8: the database sends no date and no reason then). */
    const undated = answer.hold_until === null && (rateLimited || answer.hold_placed === true);
    if (typeof answer.hold_until !== "string" && !undated) {
      return refusal("failed", notMeFailed);
    }
    revalidatePath("/settings/devices");
    return ok({
      ended: typeof answer.ended === "number" ? answer.ended : 0,
      holdUntil: typeof answer.hold_until === "string" ? answer.hold_until : null,
      holdPlaced: answer.hold_placed === true,
      holdExtended: answer.hold_extended === true,
      holdReason: holdReasonOf(answer.hold_reason),
      rateLimited,
    });
  } catch {
    return refusal("failed", notMeFailed);
  }
}

const groupSchema = z.object({
  /* A line on the screen can hold a few hundred architecture sessions; the
     cap stops a crafted request from turning one click into ten thousand
     RPCs. Anything over it is ended by "Sign out everywhere else". */
  sessionIds: z.array(z.string().uuid()).min(1).max(200),
});

export type GroupEnded = { ended: number };

export async function endSessionGroup(input: unknown): Promise<ActionResult<GroupEnded>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return refusal("unconfigured", groupFailed);
  if (session.state === "signed-out") return refusal("signed-out", groupFailed);

  const parsed = validate(groupSchema, input);
  if (!parsed.ok) return refusal("invalid", groupFailed);

  let ended = 0;
  let failures = 0;
  for (const id of new Set(parsed.data.sessionIds)) {
    try {
      const { data, error } = (await loose(session.supabase).rpc("end_session", {
        p_session: id,
      })) as { data: unknown; error: unknown };
      const answer = (data ?? {}) as { status?: unknown; was_current?: unknown };
      if (error) {
        failures += 1;
        continue;
      }
      /* `not_found` is a session that already ended: nothing to count, and
         nothing wrong. */
      if (answer.status === "ok") ended += 1;
    } catch {
      failures += 1;
    }
  }

  revalidatePath("/settings/devices");
  if (ended === 0 && failures > 0) return refusal("failed", groupFailed);
  return ok({ ended });
}
