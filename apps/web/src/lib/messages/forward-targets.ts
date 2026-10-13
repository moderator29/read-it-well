"use server";

import { resolveSession } from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { forwardTargetsFrom, type ForwardTarget } from "@/components/app/messages/forward";
import { loadConversationSummaries } from "./live";

/**
 * WHERE A MESSAGE CAN BE FORWARDED, asked for when the chooser opens.
 *
 * The list is the inbox's own summaries (the same read the inbox page and the
 * wide-screen pane make, under the reader's RLS), kept to the conversations
 * whose other side the reader follows. The follow is read once inside that
 * read, from `public.follows` through `readViewerFollowing`, and it is the same
 * fact the Requests rule uses. Asked for on open, not on every thread load, so
 * opening a conversation costs nothing extra.
 *
 * Null when there is nobody signed in, messaging is paused, or the read
 * failed; the chooser then says it could not load rather than "follow
 * someone", which would be untrue.
 */
export async function readForwardTargets(input: { fromConversationId?: string | null }): Promise<ForwardTarget[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    if (!(await isFeatureEnabled("messaging"))) return null;
    const rows = await loadConversationSummaries(session.supabase, session.user);
    const from = typeof input?.fromConversationId === "string" ? input.fromConversationId : null;
    return forwardTargetsFrom(rows, from);
  } catch {
    return null;
  }
}
