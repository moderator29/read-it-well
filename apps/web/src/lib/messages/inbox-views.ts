import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The inbox's Recent / Archived / Reported views (track G), read for one
 * person over the conversations the inbox already loaded.
 *
 *   archived   rows in `conversation_archives` (applied; see `archive.ts`).
 *              A thread archived BEFORE its latest message is
 *              shown back in Recent, so a reply is never buried.
 *   reported   what this person reported, from the existing `reports` table
 *              under its select-own policy: a report on the conversation, on a
 *              message in it, or on the person on the other side of it.
 */
export type InboxViews = {
  /** conversation id -> ISO archived_at */
  archived: Map<string, string>;
  reported: Set<string>;
  /** False when the archive table cannot be read (an environment without it). */
  archiveOpen: boolean;
};

type Thread = { id: string; counterpartId: string; lastAt: string };

export async function loadInboxViews(db: SupabaseClient, userId: string, threads: Thread[]): Promise<InboxViews> {
  const ids = threads.map((t) => t.id);
  const archived = new Map<string, string>();
  const reported = new Set<string>();
  let archiveOpen = true;
  if (ids.length === 0) return { archived, reported, archiveOpen };

  const arch = await db
    .from("conversation_archives")
    .select("conversation_id, archived_at")
    .eq("user_id", userId)
    .in("conversation_id", ids);
  if (arch.error) {
    archiveOpen = false;
  } else {
    const lastAt = new Map(threads.map((t) => [t.id, t.lastAt]));
    for (const row of (arch.data ?? []) as { conversation_id: string; archived_at: string }[]) {
      const last = lastAt.get(row.conversation_id);
      if (!last || new Date(last).getTime() <= new Date(row.archived_at).getTime()) {
        archived.set(row.conversation_id, row.archived_at);
      }
    }
  }

  const reports = await db
    .from("reports")
    .select("target_type, target_id")
    .eq("reporter_id", userId)
    .in("target_type", ["conversation", "message", "user", "profile"])
    .limit(500);
  const rows = (reports.data ?? []) as { target_type: string; target_id: string }[];
  const idSet = new Set(ids);
  const messageIds: string[] = [];
  const people = new Set<string>();
  for (const r of rows) {
    if (r.target_type === "conversation" && idSet.has(r.target_id)) reported.add(r.target_id);
    else if (r.target_type === "message") messageIds.push(r.target_id);
    else people.add(r.target_id);
  }
  if (messageIds.length > 0) {
    const msgs = await db.from("messages").select("conversation_id").in("id", messageIds.slice(0, 200));
    for (const m of (msgs.data ?? []) as { conversation_id: string }[]) {
      if (idSet.has(m.conversation_id)) reported.add(m.conversation_id);
    }
  }
  for (const t of threads) if (people.has(t.counterpartId)) reported.add(t.id);
  return { archived, reported, archiveOpen };
}
