"use server";

import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { BLOCKED_THREAD_MESSAGE, blockedBetween } from "./blocks";
import { readDirectTarget } from "./direct";
import { sendMessage } from "./actions";

/**
 * DIRECT MESSAGES (founder, 9 October 2026): the first message to a member,
 * written from their profile. Opens (or finds) the one direct chat between
 * the two people and sends the message into it, so leaving the screen without
 * sending leaves nothing behind in either inbox.
 *
 * The chat itself is made by `public.start_direct_conversation`, which checks
 * the other person has a public profile and that neither has blocked the other,
 * and the database's own trigger holds the twenty-new-chats-a-day limit that
 * listing and business chats share.
 */
const PAUSED = "Messaging is paused for maintenance. Please try again in a little while.";
const UNREACHABLE = "We could not open this chat just now. Please try again.";
const LIMIT =
  "You have opened 20 new conversations today, which is the daily limit. Your existing chats are unaffected, and you can open new ones tomorrow.";

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{
    data: unknown;
    error: { message?: string | null; code?: string | null } | null;
  }>;
};

export async function sendDirectMessage(input: {
  handle: string;
  body: string;
}): Promise<ActionResult<{ conversationId: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);
  if (!(await isFeatureEnabled("messaging"))) return fail(PAUSED);

  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!body) return fail("Type a message before sending.", { body: "Type a message before sending." });

  const read = await readDirectTarget(typeof input?.handle === "string" ? input.handle : "");
  if (read.state === "self") return fail("That is you. Pick somebody else to message.");
  if (read.state !== "ready") return fail("We could not find that person. They may have changed their name.");

  if (await blockedBetween(session.supabase, session.user.id, read.target.userId)) {
    return fail(BLOCKED_THREAD_MESSAGE);
  }

  let conversationId = read.conversationId;
  if (!conversationId) {
    const { data, error } = await (session.supabase as unknown as Rpc).rpc("start_direct_conversation", {
      p_other: read.target.userId,
    });
    if (error || typeof data !== "string") {
      if (error?.code === "54000") return fail(LIMIT);
      if (error?.code === "42501") return fail(BLOCKED_THREAD_MESSAGE);
      return fail(UNREACHABLE);
    }
    conversationId = data;
  }

  const sent = await sendMessage({ conversationId, body });
  if (!sent.ok) return fail(sent.error, sent.fieldErrors);
  return ok({ conversationId });
}
