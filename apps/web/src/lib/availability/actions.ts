"use server";

import { z } from "zod";
import { formatDate, getDictionary } from "@vallo/i18n";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession, SIGNED_OUT_MESSAGE } from "../actions/session";
import { getLocale } from "../locale";
import { sendMessage, startConversation } from "../messages/actions";
import { isLaterDate } from "./check";
import { availabilityTable } from "./table";
import { attributeConversation } from "../share/attribution";

/**
 * V-14: ASK "STILL AVAILABLE?" IN ONE TAP, ANSWER IT IN ONE TAP.
 *
 * Both halves do two things in order: a row through a guarded database
 * function (`ask_availability`, `answer_availability`), then an ordinary
 * message through the ordinary `sendMessage`, so the words are scanned,
 * blocked and notified exactly like anything else anybody types. The row is
 * what makes the question countable and the answer one tap; the message is
 * what the other person reads in the chat and in their notification.
 *
 * If the row succeeds and the message fails, the question still stands and
 * the card in the thread shows it, which is the honest state; nothing is
 * rolled back into a lie.
 *
 * This module exports only async functions, per the server-actions rule.
 */

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { hint?: string; code?: string } | null }>;

const askSchema = z.object({ listingId: z.string().uuid() });

export async function askStillAvailable(input: unknown): Promise<ActionResult<{ conversationId: string }>> {
  const t = getDictionary(await getLocale()).frontDoor.available;
  const parsed = validate(askSchema, input);
  if (!parsed.ok) return fail(t.failed);
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const thread = await startConversation({ listingId: parsed.data.listingId });
  if (!thread.ok) return fail(thread.error);
  const conversationId = thread.data.conversationId;
  /* V-71: credit the lister whose link this device first came through. */
  await attributeConversation(session.supabase, conversationId);

  /* An open question on this thread is the answer to a second tap: no second
     row and no second message. */
  const { data: open } = await availabilityTable(session.supabase)
    .select("id")
    .eq("conversation_id", conversationId)
    .is("answer", null)
    .maybeSingle();
  if (open) return ok({ conversationId });

  const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
  const { error } = await rpc("ask_availability", { p_conversation: conversationId });
  if (error) {
    if (error.hint === "availability_rate_limited") return fail(t.rateLimited);
    if (error.hint === "availability_recently_let") return fail(t.recentlyLet.replace(" on {date}", ""));
    if (error.code === "22023") return fail(t.notAskable);
    return fail(t.failed);
  }
  await sendMessage({ conversationId, body: t.askBody });
  return ok({ conversationId });
}

const answerSchema = z.object({
  checkId: z.string().uuid(),
  answer: z.enum(["available", "available_later", "let"]),
  from: z.string().optional(),
});

export async function answerStillAvailable(input: unknown): Promise<ActionResult<null>> {
  const locale = await getLocale();
  const t = getDictionary(locale).frontDoor.available;
  const parsed = validate(answerSchema, input);
  if (!parsed.ok) return fail(t.answerFailed);
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const { answer, checkId } = parsed.data;
  const from = answer === "available_later" ? (parsed.data.from ?? "") : null;
  const today = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
  if (from !== null && !isLaterDate(from, today)) return fail(t.answerFailed);

  const { data: row } = await availabilityTable(session.supabase)
    .select("conversation_id")
    .eq("id", checkId)
    .maybeSingle();
  const conversationId = (row as { conversation_id?: string } | null)?.conversation_id;
  if (!conversationId) return fail(t.answerFailed);

  const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
  const { error } = await rpc("answer_availability", { p_check: checkId, p_answer: answer, p_from: from });
  if (error) return fail(t.answerFailed);

  const body =
    answer === "available"
      ? t.replyYes
      : answer === "let"
        ? t.replyLet
        : t.replyLater.replace(
            "{date}",
            formatDate(new Date(`${from}T12:00:00+01:00`), locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Africa/Lagos",
            }),
          );
  await sendMessage({ conversationId, body });
  return ok(null);
}
