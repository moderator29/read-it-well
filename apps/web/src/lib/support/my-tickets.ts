import "server-only";

import { resolveSession } from "../actions/session";
import { supportTopicLabel } from "../trust/support-topics";
import { isTicketId, summariseThread, type TicketMessage, type ThreadSummary } from "./tickets";

/**
 * A member's own support tickets and their threads, read.
 *
 * Every read runs on the member's own Row Level Security client:
 * `support_tickets_select_own` limits tickets to `user_id = auth.uid()`, and
 * `support_ticket_messages_select` limits messages to threads on a ticket the
 * member owns. The `eq("user_id", ...)` below is belt and braces, not the
 * authorisation. A ticket filed while signed out has no owner, so it is not
 * here, and the screens say so rather than showing "you have never asked".
 *
 * Fails into "unreadable", which the screens say in words.
 */

export type TicketSummary = {
  id: string;
  reference: string;
  topic: string | null;
  status: string;
  createdAt: string;
  thread: ThreadSummary;
};

export type MyTickets = { state: "signed-out" } | { state: "unreadable" } | { state: "ok"; tickets: TicketSummary[] };

export type MyTicket =
  | { state: "signed-out" }
  | { state: "unreadable" }
  | { state: "not-found" }
  | {
      state: "ok";
      ticket: { id: string; reference: string; topic: string | null; status: string; body: string; createdAt: string };
      messages: TicketMessage[];
    };

type MessageRow = { id: string; ticket_id: string; sender_role: string; body: string; created_at: string };

function toMessage(row: MessageRow): TicketMessage {
  return {
    id: row.id,
    senderRole: row.sender_role === "admin" ? "admin" : "user",
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function loadMyTickets(limit = 50): Promise<MyTickets> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  try {
    const { data: tickets, error } = await session.supabase
      .from("support_tickets")
      .select("id, reference, topic, status, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !tickets) return { state: "unreadable" };
    if (tickets.length === 0) return { state: "ok", tickets: [] };

    /* One sweep for every thread rather than a read per ticket. */
    const { data: rows, error: messageError } = await session.supabase
      .from("support_ticket_messages")
      .select("id, ticket_id, sender_role, body, created_at")
      .in(
        "ticket_id",
        tickets.map((ticket) => ticket.id),
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (messageError) return { state: "unreadable" };

    const byTicket = new Map<string, TicketMessage[]>();
    for (const row of rows ?? []) {
      const list = byTicket.get(row.ticket_id) ?? [];
      list.push(toMessage(row));
      byTicket.set(row.ticket_id, list);
    }

    return {
      state: "ok",
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        reference: ticket.reference,
        topic: supportTopicLabel(ticket.topic) ?? ticket.topic,
        status: ticket.status,
        createdAt: ticket.created_at,
        thread: summariseThread(byTicket.get(ticket.id) ?? []),
      })),
    };
  } catch {
    return { state: "unreadable" };
  }
}

export async function loadMyTicket(id: string): Promise<MyTicket> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  if (!isTicketId(id)) return { state: "not-found" };
  try {
    const { data: ticket, error } = await session.supabase
      .from("support_tickets")
      .select("id, reference, topic, status, body, created_at")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) return { state: "unreadable" };
    if (!ticket) return { state: "not-found" };

    const { data: rows, error: messageError } = await session.supabase
      .from("support_ticket_messages")
      .select("id, ticket_id, sender_role, body, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (messageError) return { state: "unreadable" };

    return {
      state: "ok",
      ticket: {
        id: ticket.id,
        reference: ticket.reference,
        topic: supportTopicLabel(ticket.topic) ?? ticket.topic,
        status: ticket.status,
        body: ticket.body,
        createdAt: ticket.created_at,
      },
      messages: (rows ?? []).map(toMessage),
    };
  } catch {
    return { state: "unreadable" };
  }
}
