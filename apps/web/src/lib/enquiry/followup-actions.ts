"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession, SIGNED_OUT_MESSAGE } from "../actions/session";
import { getLocale } from "../locale";
import { checkFollowup, messageForDbError, type FollowupRefusal } from "./followup";
import { callSetEnquiryFollowup } from "./followup-rpc";

/**
 * AGENT-01: SETTING OR CLEARING A FOLLOW-UP BY HAND.
 *
 * Through the lister's own client, because `set_enquiry_followup` reads
 * `auth.uid()` and refuses anybody but the thread's lister (the same check as
 * `set_enquiry_stage`). The date rules run here first so the lister is told
 * which rule they broke, and the function enforces them again, so a crafted
 * post cannot store a past date or a note without a date.
 *
 * Clearing sends a null date; the row stays with no date (the database never
 * DELETEs here), and the reminder job ignores a row without one.
 *
 * This module exports only async functions, per the server-actions rule.
 */

const schema = z.object({
  conversationId: z.string().uuid(),
  dueOn: z.string().max(10).nullable(),
  note: z.string().max(1000).nullable().optional(),
});

type Words = ReturnType<typeof wordsFor>;

function wordsFor(locale: Awaited<ReturnType<typeof getLocale>>) {
  return getDictionary(locale).workspaceDash.followup;
}

function refusalText(reason: FollowupRefusal, w: Words): string {
  switch (reason) {
    case "past":
      return w.errPast;
    case "far":
      return w.errFar;
    case "note":
      return w.errNote;
    default:
      return w.errFormat;
  }
}

export async function setEnquiryFollowup(input: unknown): Promise<ActionResult<{ saved: true }>> {
  const w = wordsFor(await getLocale());
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(w.errFailed);
  const checked = checkFollowup({ dueOn: parsed.data.dueOn, note: parsed.data.note ?? null }, new Date());
  if (!checked.ok) return fail(refusalText(checked.reason, w));
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);
  try {
    const { error } = await callSetEnquiryFollowup(session.supabase, {
      p_conversation: parsed.data.conversationId,
      p_due: checked.dueOn,
      p_note: checked.note,
    });
    if (error) return fail(messageForDbError(error, w));
  } catch {
    return fail(w.errFailed);
  }
  revalidatePath("/agent/messages");
  revalidatePath("/agent/dashboard");
  revalidatePath(`/messages/${parsed.data.conversationId}`);
  return ok({ saved: true });
}
