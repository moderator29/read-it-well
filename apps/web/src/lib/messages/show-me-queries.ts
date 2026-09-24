import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { flagIsOn, SHOW_ME_FLAG } from "../flags/read";
import { isShowMeItem, type ShowMeRequest } from "./show-me";

/**
 * The thread's "Show me" requests, under the caller's own policy (the two
 * parties only), each answered clip with a signed URL good for an hour.
 * Null when the flag is off or the table is not there: the thread then draws
 * nothing about it.
 */
export async function readShowMe(
  supabase: SupabaseClient<Database>,
  conversationId: string,
): Promise<{ requests: ShowMeRequest[]; canAsk: boolean } | null> {
  if (!(await flagIsOn(SHOW_ME_FLAG))) return null;
  try {
    /* An example listing's thread has nothing real to film: no panel (review). */
    const { data: convo } = await supabase
      .from("conversations")
      .select("listing_id, listings(is_demo)")
      .eq("id", conversationId)
      .maybeSingle();
    /* Only a KNOWN example hides the panel: the embed goes through listings'
       own policy, so a listing no longer published comes back null, and the
       asks already in this thread must stay readable (review). */
    const listing = (convo as unknown as { listings: { is_demo: boolean } | null } | null)?.listings;
    if (!convo || listing?.is_demo === true) return null;
    /* A listing the renter can no longer see: past asks stay, no new one. */
    const canAsk = listing !== null && listing !== undefined;
    const { data, error } = await supabase
      .from("show_me_requests" as never)
      .select("id, item, note, status, created_at, expires_at, answered_at, clip_path, clip_seconds")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error || !data) return null;
    const rows = data as unknown as {
      id: string;
      item: string;
      note: string | null;
      status: string;
      created_at: string;
      expires_at: string;
      answered_at: string | null;
      clip_path: string | null;
      clip_seconds: number | null;
    }[];
    const out: ShowMeRequest[] = [];
    for (const row of rows) {
      if (!isShowMeItem(row.item)) continue;
      let clipUrl: string | null = null;
      let clipBytes: number | null = null;
      if (row.clip_path) {
        const bucket = supabase.storage.from("show-me-clips");
        const { data: signed } = await bucket.createSignedUrl(row.clip_path, 3600);
        clipUrl = signed?.signedUrl ?? null;
        /* The file's size, for the data saver's "tap to play, 2.4 MB" line. */
        const [folder, file] = row.clip_path.split("/");
        if (folder && file) {
          const { data: listed } = await bucket.list(folder, { search: file, limit: 1 });
          const size = (listed?.[0]?.metadata as { size?: unknown } | undefined)?.size;
          clipBytes = typeof size === "number" && size > 0 ? size : null;
        }
      }
      out.push({
        id: row.id,
        item: row.item,
        note: row.note,
        status: row.status === "answered" ? "answered" : "open",
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        answeredAt: row.answered_at,
        clipSeconds: row.clip_seconds,
        clipUrl,
        clipBytes,
      });
    }
    /* Nothing asked and nothing can be: no panel at all. */
    if (!canAsk && out.length === 0) return null;
    return { requests: out, canAsk };
  } catch {
    return null;
  }
}
