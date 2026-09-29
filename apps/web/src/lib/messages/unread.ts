/**
 * UNREAD MESSAGE COUNTS, EXACT (DB2).
 *
 * `public.my_unread_counts()` (migrations 20260929001906, 20260929012813)
 * returns one row per conversation the caller is a party to (as guest or
 * agent, never as an admin reading someone else's thread) with the number of
 * messages addressed to them that are still unread, and `as_agent`, whether
 * the caller is the agent (lister) side of it. It reads a partial index over
 * unread messages only, so it is exact however busy the inbox is. It replaces
 * the 400-message sweep in `live.ts`, which could not see an unread message
 * below the 400th, and the agent badge's platform-wide count.
 *
 * No `server-only` import: this is a plain function of a client, so both the
 * pure fold and its test live here; callers are all server modules.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

export type UnreadCounts = {
  total: number;
  /** The unread messages in the threads where the caller is the agent side. */
  asAgent: number;
  byConversation: Map<string, number>;
};

type Row = { conversation_id?: unknown; unread?: unknown; as_agent?: unknown };

/** Pure: fold the function's rows. Anything malformed is skipped, never counted. */
export function unreadFromRows(rows: readonly Row[] | null | undefined): UnreadCounts {
  const byConversation = new Map<string, number>();
  let total = 0;
  let asAgent = 0;
  for (const row of rows ?? []) {
    const id = typeof row.conversation_id === "string" ? row.conversation_id : null;
    const n = Number(row.unread);
    if (!id || !Number.isFinite(n) || n <= 0) continue;
    const count = Math.floor(n);
    byConversation.set(id, (byConversation.get(id) ?? 0) + count);
    total += count;
    if (row.as_agent === true) asAgent += count;
  }
  return { total, asAgent, byConversation };
}

/**
 * The caller's unread counts, or null when the read failed (so a caller can
 * fall back, or show nothing, rather than show a wrong zero as a fact).
 */
export async function loadUnreadCounts(supabase: SupabaseClient<Database>): Promise<UnreadCounts | null> {
  try {
    const { data, error } = await supabase.rpc("my_unread_counts");
    if (error || !Array.isArray(data)) return null;
    return unreadFromRows(data);
  } catch {
    return null;
  }
}
