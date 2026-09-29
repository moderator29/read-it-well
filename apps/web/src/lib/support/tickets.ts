/**
 * A member's support tickets, as the inbox reads them.
 *
 * Pure on purpose: the list and the thread both derive what they show (who
 * spoke last, whether the member can still reply, a one-line preview) from
 * the rows the member's own Row Level Security client returned, and these
 * rules are the part worth testing without a database.
 */

export type TicketStatus = "open" | "pending" | "resolved" | "closed";

export type TicketMessage = {
  id: string;
  senderRole: "user" | "admin";
  body: string;
  createdAt: string;
};

export type TicketStatusCopy = {
  label: string;
  tone: "success" | "warning" | "info" | "neutral";
  meaning: string;
};

export const TICKET_STATUS: Record<TicketStatus, TicketStatusCopy> = {
  open: { label: "Open", tone: "warning", meaning: "Filed and waiting for a person to pick it up." },
  pending: { label: "In progress", tone: "info", meaning: "A person has it and is working on it." },
  resolved: { label: "Resolved", tone: "success", meaning: "Answered. Start a new question if something else comes up." },
  closed: { label: "Closed", tone: "neutral", meaning: "Closed. Start a new question if you still need help." },
};

export function ticketStatusCopy(status: string): TicketStatusCopy {
  return TICKET_STATUS[status as TicketStatus] ?? { label: status, tone: "neutral", meaning: "" };
}

/**
 * A member may add to a ticket while a person is still working it.
 *
 * Once it is resolved or closed nobody is reading that queue, so a reply
 * there would be a message into nothing: the thread says so and offers a new
 * question instead.
 */
export function canMemberReply(status: string): boolean {
  return status === "open" || status === "pending";
}

export type ThreadSummary = {
  /** The newest message, or null when the thread holds none yet. */
  last: TicketMessage | null;
  /** How many replies support has written. */
  supportReplies: number;
  /** True when support spoke last, so the next move is the member's. */
  supportSpokeLast: boolean;
};

/** Who spoke last and how many times support has answered, in any row order. */
export function summariseThread(messages: readonly TicketMessage[]): ThreadSummary {
  let last: TicketMessage | null = null;
  let supportReplies = 0;
  for (const message of messages) {
    if (message.senderRole === "admin") supportReplies += 1;
    if (!last || message.createdAt > last.createdAt) last = message;
  }
  return { last, supportReplies, supportSpokeLast: last?.senderRole === "admin" };
}

/** Oldest first, the order a conversation is read in. */
export function orderThread(messages: readonly TicketMessage[]): TicketMessage[] {
  return [...messages].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

/** One line of a message for a list row: whitespace collapsed, cut at a word. */
export function previewText(body: string, max = 90): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A ticket id from a URL, checked before it goes anywhere near a query. */
export function isTicketId(value: string): boolean {
  return UUID_RE.test(value);
}
