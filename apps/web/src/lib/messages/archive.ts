"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";

/**
 * ARCHIVE A CONVERSATION FOR YOURSELF (track G).
 *
 * Per person: archiving never hides a thread from the other party, so it is a
 * row in `conversation_archives` (one per person and conversation), not a
 * column on `conversations`. That table is written in
 * `supabase/migrations/pending/20260925150000_track_g_archive_a_conversation_for_yourself.sql`
 * and is NOT applied yet; until it is, both actions answer with a sentence and
 * the inbox says Archive is not open. The client handle is untyped because
 * the generated types do not carry the table yet; it is the caller's own RLS
 * session, never the service role.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_OPEN = "Archiving conversations is not open yet. Nothing was changed.";

/** 42P01 undefined table; PGRST205 table not in the schema cache. */
function isMissingTable(code: string | undefined): boolean {
  return code === "42P01" || code === "PGRST205" || code === "PGRST200";
}

async function write(conversationId: string, archive: boolean): Promise<ActionResult<{ archived: boolean }>> {
  if (typeof conversationId !== "string" || !UUID_RE.test(conversationId)) {
    return fail("We could not find that conversation.");
  }
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const db = session.supabase as unknown as SupabaseClient;
  const result = archive
    ? await db
        .from("conversation_archives")
        .upsert({ user_id: session.user.id, conversation_id: conversationId, archived_at: new Date().toISOString() })
    : await db
        .from("conversation_archives")
        .delete()
        .eq("user_id", session.user.id)
        .eq("conversation_id", conversationId);
  if (result.error) {
    if (isMissingTable(result.error.code)) return fail(NOT_OPEN);
    if (result.error.code === "42501") return fail("You can only archive your own conversations.");
    return fail("That did not save. Please try again.");
  }
  revalidatePath("/messages");
  return ok({ archived: archive });
}

export async function archiveConversation(input: { conversationId: string }): Promise<ActionResult<{ archived: boolean }>> {
  return write(input?.conversationId, true);
}

export async function unarchiveConversation(input: { conversationId: string }): Promise<ActionResult<{ archived: boolean }>> {
  return write(input?.conversationId, false);
}
