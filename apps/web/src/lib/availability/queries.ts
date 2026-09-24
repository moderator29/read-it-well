import "server-only";

import { resolveSession } from "../actions/session";
import { checkFromRow, type AvailabilityCheck } from "./check";
import { availabilityTable } from "./table";

/**
 * The latest still-available question on one thread, for the card the thread
 * draws: the open one if there is one, otherwise the last answered. Read under
 * the reader's own RLS, so only the two parties ever get a row. A failed read
 * is no card, never a guessed one.
 */
export async function readAvailabilityForConversation(conversationId: string): Promise<AvailabilityCheck | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await availabilityTable(session.supabase)
      .select("id, conversation_id, listing_id, asker_id, lister_id, asked_at, answer, available_from, answered_at")
      .eq("conversation_id", conversationId)
      .order("asked_at", { ascending: false })
      .limit(1);
    if (error || !Array.isArray(data)) return null;
    return checkFromRow(data[0] as Record<string, unknown> | undefined, session.user.id);
  } catch {
    return null;
  }
}

/** The thread ids where this lister has an unanswered question, for the inbox. */
export async function readOpenQuestionsForLister(): Promise<Set<string>> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return new Set();
  try {
    const { data, error } = await availabilityTable(session.supabase)
      .select("conversation_id")
      .eq("lister_id", session.user.id)
      .is("answer", null)
      .limit(200);
    if (error || !Array.isArray(data)) return new Set();
    return new Set((data as { conversation_id: string }[]).map((row) => row.conversation_id));
  } catch {
    return new Set();
  }
}

/**
 * When the lister last said "let" about this listing, within seven days and
 * not since contradicted, or null. The listing page shows that sentence in
 * place of the ask button (V-14 review). A failed read is null: the database
 * refuses the ask itself either way.
 */
export async function readRecentlyLet(listingId: string): Promise<string | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const rpc = session.supabase.rpc.bind(session.supabase) as unknown as (
      fn: "listing_recently_let",
      args: { p_listing: string },
    ) => PromiseLike<{ data: unknown; error: unknown }>;
    const { data, error } = await rpc("listing_recently_let", { p_listing: listingId });
    return !error && typeof data === "string" ? data : null;
  } catch {
    return null;
  }
}
