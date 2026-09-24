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
): Promise<ShowMeRequest[] | null> {
  if (!(await flagIsOn(SHOW_ME_FLAG))) return null;
  try {
    /* An example listing's thread has nothing real to film: no panel (review). */
    const { data: convo } = await supabase
      .from("conversations")
      .select("listing_id, listings(is_demo)")
      .eq("id", conversationId)
      .maybeSingle();
    const listing = (convo as unknown as { listings: { is_demo: boolean } | null } | null)?.listings;
    if (!convo || !listing || listing.is_demo) return null;
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
      if (row.clip_path) {
        const { data: signed } = await supabase.storage.from("show-me-clips").createSignedUrl(row.clip_path, 3600);
        clipUrl = signed?.signedUrl ?? null;
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
      });
    }
    return out;
  } catch {
    return null;
  }
}
