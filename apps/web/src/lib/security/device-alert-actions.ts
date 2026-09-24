"use server";

/**
 * "THIS WAS NOT ME", AND ENDING A WHOLE LINE OF THE DEVICES SCREEN. V-19.
 *
 * Both actions answer with a CODE rather than a sentence. The screen maps the
 * code onto the dictionary (`platform.devices` in `platform.en.ts`), so every
 * word a person reads on these two surfaces is translatable and none of it is
 * written twice.
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

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession } from "../actions/session";

type Loose = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<unknown> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (client: unknown) => client as any as Loose;

export type DeviceAlertError = "signed-out" | "unconfigured" | "failed" | "invalid" | "rate-limited";

export type NotMeResult = {
  /** How many other sessions were ended. Zero is an honest answer. */
  ended: number;
  /** ISO 8601. When withdrawals and sends open again. */
  holdUntil: string;
  /** False when a hold was already in force and this press did not add one. */
  holdPlaced: boolean;
  /** True when a press from an older session lengthened a hold already in force. */
  holdExtended: boolean;
};

export async function reportNotMe(): Promise<ActionResult<NotMeResult>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail("unconfigured" satisfies DeviceAlertError);
  if (session.state === "signed-out") return fail("signed-out" satisfies DeviceAlertError);

  try {
    const { data, error } = (await loose(session.supabase).rpc("report_not_me")) as {
      data: unknown;
      error: unknown;
    };
    if (error || !data || typeof data !== "object") return fail("failed" satisfies DeviceAlertError);
    const answer = data as {
      status?: unknown;
      ended?: unknown;
      hold_until?: unknown;
      hold_placed?: unknown;
      hold_extended?: unknown;
    };
    if (answer.status === "rate_limited") return fail("rate-limited" satisfies DeviceAlertError);
    if (answer.status !== "ok" || typeof answer.hold_until !== "string") {
      return fail("failed" satisfies DeviceAlertError);
    }
    revalidatePath("/settings/devices");
    revalidatePath("/wallet");
    return ok({
      ended: typeof answer.ended === "number" ? answer.ended : 0,
      holdUntil: answer.hold_until,
      holdPlaced: answer.hold_placed === true,
      holdExtended: answer.hold_extended === true,
    });
  } catch {
    return fail("failed" satisfies DeviceAlertError);
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
  if (session.state === "unconfigured") return fail("unconfigured" satisfies DeviceAlertError);
  if (session.state === "signed-out") return fail("signed-out" satisfies DeviceAlertError);

  const parsed = validate(groupSchema, input);
  if (!parsed.ok) return fail("invalid" satisfies DeviceAlertError);

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
  if (ended === 0 && failures > 0) return fail("failed" satisfies DeviceAlertError);
  return ok({ ended });
}
