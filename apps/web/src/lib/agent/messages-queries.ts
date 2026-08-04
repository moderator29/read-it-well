import "server-only";

import { loadConversationSummaries, type LiveConversationSummary } from "../messages/live";
import { getAgentContext } from "./listings-queries";

/**
 * Read side of the host inbox.
 *
 * Agents already receive real conversations under RLS through
 * private.in_conversation, and until now could only read them at /messages,
 * the guest surface, with no host framing at all. This is the framing: which
 * enquiries are still waiting on a reply, how long they have waited, and which
 * listing each one is about.
 *
 * Everything reads through the agent's own RLS-bound client, so a thread that
 * is not theirs never comes back. There is no new table and no new write path:
 * replying is the existing sendMessage action on the existing thread route.
 */

export type AgentThread = LiveConversationSummary & {
  /**
   * True when this enquiry still needs the host. Either the guest spoke last,
   * or there are unread messages. Read state alone is not enough: an agent can
   * open an enquiry, read it, and never answer, and that thread is still the
   * one costing them a booking.
   */
  waitingOnYou: boolean;
  /** Whole hours since the last message, for ageing the waiting list. */
  waitingHours: number;
};

export type AgentInbox = {
  threads: AgentThread[];
  waitingCount: number;
  /** Hours the oldest unanswered enquiry has been waiting, or 0 when none is. */
  oldestWaitingHours: number;
};

export type AgentInboxRead =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "not-agent" }
  | { state: "unavailable" }
  | { state: "ready"; inbox: AgentInbox };

function hoursSince(iso: string): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 3_600_000));
}

export async function getAgentInbox(): Promise<AgentInboxRead> {
  const context = await getAgentContext();
  if (context.state === "unconfigured") return { state: "unconfigured" };
  if (context.state === "signed-out") return { state: "signed-out" };
  if (context.state === "not-agent") return { state: "not-agent" };

  try {
    const summaries = await loadConversationSummaries(context.supabase, context.user);

    const threads: AgentThread[] = summaries.map((s) => ({
      ...s,
      waitingOnYou: !s.lastFromMe || s.unread > 0,
      waitingHours: hoursSince(s.lastAt),
    }));

    // Waiting first, and within that the one that has waited longest, because
    // that is the order a host should work them in.
    threads.sort((a, b) => {
      if (a.waitingOnYou !== b.waitingOnYou) return a.waitingOnYou ? -1 : 1;
      if (a.waitingOnYou) return b.waitingHours - a.waitingHours;
      return a.lastAt < b.lastAt ? 1 : -1;
    });

    const waiting = threads.filter((t) => t.waitingOnYou);

    return {
      state: "ready",
      inbox: {
        threads,
        waitingCount: waiting.length,
        oldestWaitingHours: waiting.reduce((max, t) => Math.max(max, t.waitingHours), 0),
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}

/**
 * Unread messages across every conversation the caller is in.
 *
 * This is what the navigation badge reads. It replaces a hardcoded 3 that every
 * agent saw permanently and could never clear, on a route that was a
 * placeholder. Returns 0 rather than throwing, because a badge is never worth
 * taking a page down for.
 */
export async function getUnreadMessageCount(): Promise<number> {
  const context = await getAgentContext();
  if (context.state !== "agent" && context.state !== "not-agent") return 0;

  try {
    const { count, error } = await context.supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .neq("sender_id", context.user.id);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
