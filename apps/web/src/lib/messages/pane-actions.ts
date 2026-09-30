"use server";

import { resolveSession } from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { loadConversationSummaries } from "./live";

/**
 * B17: THE INBOX PANE BESIDE A THREAD, ON A WIDE SCREEN.
 *
 * Asked for by the client only once the viewport is 64rem or wider, so a
 * phone never pays for a list it will not draw. Read under the caller's own
 * session and RLS, exactly like the inbox page; requests (strangers who have
 * not been answered) stay out of the pane as they stay out of the main list.
 * Only what a row prints leaves the server.
 */
export type PaneRow = {
  id: string;
  name: string;
  title: string | null;
  last: string;
  when: string;
  unread: number;
};

export async function readInboxPane(): Promise<PaneRow[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    if (!(await isFeatureEnabled("messaging"))) return null;
    const rows = await loadConversationSummaries(session.supabase, session.user);
    return rows
      .filter((c) => !c.isRequest)
      .slice(0, 60)
      .map((c) => ({
        id: c.id,
        name: c.counterpartName,
        title: c.listingTitle,
        last: c.lastMessage,
        when: c.whenLabel,
        unread: c.unread,
      }));
  } catch {
    return null;
  }
}
