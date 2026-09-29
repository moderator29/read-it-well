import "server-only";

import { resolveSession } from "../actions/session";
import { supportTopicLabel } from "../trust/support-topics";
import { hasUnread, isTicketId, summariseThread, type TicketMessage, type ThreadSummary } from "./tickets";

/**
 * A member's own support tickets and their threads, read.
 *
 * Every read runs on the member's own Row Level Security client:
 * `support_tickets_select_own` limits tickets to `user_id = auth.uid()`,
 * `support_ticket_messages_select` limits messages to threads on a ticket the
 * member owns, and `support_ticket_attachments_select` does the same for the
 * photos. The `eq("user_id", ...)` below is belt and braces, not the
 * authorisation. A ticket filed while signed out has no owner, so it is not
 * here, and the screens say so rather than showing "you have never asked".
 *
 * Fails into "unreadable", which the screens say in words with a retry.
 */

export type TicketSummary = {
  id: string;
  reference: string;
  /** The stored code, for the response clock. */
  topicCode: string | null;
  /** The code in words, for the screen. */
  topic: string | null;
  status: string;
  createdAt: string;
  thread: ThreadSummary;
  /** A staff reply the member has not opened yet. */
  unread: boolean;
};

export type MyTickets = { state: "signed-out" } | { state: "unreadable" } | { state: "ok"; tickets: TicketSummary[] };

export type TicketAttachment = {
  id: string;
  messageId: string | null;
  /** A signed link that lasts an hour, or null when signing failed. */
  url: string | null;
  width: number | null;
  height: number | null;
};

export type TicketDetail = {
  id: string;
  reference: string;
  topicCode: string | null;
  topic: string | null;
  kind: "question" | "problem";
  status: string;
  body: string;
  createdAt: string;
  resolvedAt: string | null;
  memberReadAt: string | null;
  related: { kind: string; label: string } | null;
  rating: number | null;
  ratingComment: string | null;
};

export type MyTicket =
  | { state: "signed-out" }
  | { state: "unreadable" }
  | { state: "not-found" }
  | { state: "ok"; ticket: TicketDetail; messages: TicketMessage[]; attachments: TicketAttachment[] };

type MessageRow = {
  id: string;
  ticket_id: string;
  sender_role: string;
  body: string;
  created_at: string;
  staff_name: string | null;
};

function toMessage(row: MessageRow): TicketMessage {
  return {
    id: row.id,
    senderRole: row.sender_role === "admin" ? "admin" : "user",
    body: row.body,
    createdAt: row.created_at,
    staffName: row.sender_role === "admin" ? row.staff_name : null,
  };
}

export async function loadMyTickets(limit = 50): Promise<MyTickets> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  try {
    const { data: tickets, error } = await session.supabase
      .from("support_tickets")
      .select("id, reference, topic, status, created_at, member_read_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error || !tickets) return { state: "unreadable" };
    if (tickets.length === 0) return { state: "ok", tickets: [] };

    /* One sweep for every thread rather than a read per ticket. */
    const { data: rows, error: messageError } = await session.supabase
      .from("support_ticket_messages")
      .select("id, ticket_id, sender_role, body, created_at, staff_name")
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
      tickets: tickets.map((ticket) => {
        const thread = summariseThread(byTicket.get(ticket.id) ?? []);
        return {
          id: ticket.id,
          reference: ticket.reference,
          topicCode: ticket.topic,
          topic: supportTopicLabel(ticket.topic) ?? ticket.topic,
          status: ticket.status,
          createdAt: ticket.created_at,
          thread,
          unread: hasUnread(thread.lastSupportAt, ticket.member_read_at),
        };
      }),
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
      .select(
        "id, reference, topic, kind, status, body, created_at, resolved_at, member_read_at, related_kind, related_label, rating, rating_comment",
      )
      .eq("id", id)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) return { state: "unreadable" };
    if (!ticket) return { state: "not-found" };

    const [{ data: rows, error: messageError }, { data: files }] = await Promise.all([
      session.supabase
        .from("support_ticket_messages")
        .select("id, ticket_id, sender_role, body, created_at, staff_name")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true })
        .limit(200),
      session.supabase
        .from("support_ticket_attachments")
        .select("id, message_id, storage_path, width, height")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true })
        .limit(40),
    ]);
    if (messageError) return { state: "unreadable" };

    /* Photos are signed on the member's own client, so the storage read
       policy (their own folder) is what lets the link exist. A photo whose
       link cannot be made still shows as a photo the team can see. */
    const paths = (files ?? []).map((file) => file.storage_path);
    const signed = new Map<string, string>();
    if (paths.length > 0) {
      try {
        const { data: links } = await session.supabase.storage.from("support-attachments").createSignedUrls(paths, 3600);
        for (const link of links ?? []) if (link.path && link.signedUrl) signed.set(link.path, link.signedUrl);
      } catch {
        // Leave the links empty; the thread still reads.
      }
    }

    return {
      state: "ok",
      ticket: {
        id: ticket.id,
        reference: ticket.reference,
        topicCode: ticket.topic,
        topic: supportTopicLabel(ticket.topic) ?? ticket.topic,
        kind: ticket.kind === "problem" ? "problem" : "question",
        status: ticket.status,
        body: ticket.body,
        createdAt: ticket.created_at,
        resolvedAt: ticket.resolved_at,
        memberReadAt: ticket.member_read_at,
        related: ticket.related_kind && ticket.related_label ? { kind: ticket.related_kind, label: ticket.related_label } : null,
        rating: ticket.rating,
        ratingComment: ticket.rating_comment,
      },
      messages: (rows ?? []).map(toMessage),
      attachments: (files ?? []).map((file) => ({
        id: file.id,
        messageId: file.message_id,
        url: signed.get(file.storage_path) ?? null,
        width: file.width,
        height: file.height,
      })),
    };
  } catch {
    return { state: "unreadable" };
  }
}
