/**
 * A member's support tickets, as the inbox reads them.
 *
 * Pure on purpose: the list and the thread both derive what they show (who
 * spoke last, the member-facing status, whether there is something unread,
 * whether the member can still reply, reopen or rate, and how soon a person
 * answers) from the rows the member's own Row Level Security client returned,
 * and these rules are the part worth testing without a database.
 */

import { RESPONSE_COMMITMENTS } from "../trust/standards";
import { gradeForTopic } from "../trust/support-topics";

export type TicketStatus = "open" | "pending" | "resolved" | "closed";

export type TicketMessage = {
  id: string;
  senderRole: "user" | "admin";
  body: string;
  createdAt: string;
  /** The replying staff member's first name, written by the database. Null on member messages. */
  staffName?: string | null;
};

export type TicketStatusCopy = {
  label: string;
  tone: "success" | "warning" | "info" | "neutral" | "brand";
  meaning: string;
};

/** The database status in words, for surfaces that do not know who spoke last. */
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
 * The four states a member sees.
 *
 * The database has open, pending, resolved and closed, and none of them says
 * whose move it is. "Waiting on you" is the one a member most needs and it is
 * derived: support spoke last on a ticket still being worked. Resolved and
 * closed read as one state to the member, because either way nobody is working
 * it; the meaning line says which.
 */
export type MemberTicketState = "open" | "waiting" | "progress" | "resolved";

export const MEMBER_STATE: Record<MemberTicketState, TicketStatusCopy> = {
  open: {
    label: "Open",
    tone: "neutral",
    meaning: "Filed. A person will pick it up and reply here.",
  },
  waiting: {
    label: "Waiting on you",
    tone: "brand",
    meaning: "The team replied and needs something from you. Reply below.",
  },
  progress: {
    label: "In progress",
    tone: "info",
    meaning: "A person has it and is working on it.",
  },
  resolved: {
    label: "Resolved",
    tone: "success",
    meaning: "Answered. If it is not sorted, reopen it below.",
  },
};

export function memberTicketState(status: string, supportSpokeLast: boolean): MemberTicketState {
  if (status === "resolved" || status === "closed") return "resolved";
  if (supportSpokeLast) return "waiting";
  if (status === "pending") return "progress";
  return "open";
}

export function memberStateCopy(status: string, supportSpokeLast: boolean): TicketStatusCopy {
  const state = memberTicketState(status, supportSpokeLast);
  if (state === "resolved" && status === "closed") {
    return { ...MEMBER_STATE.resolved, meaning: "Closed by the team. Ask a new question if you still need help." };
  }
  return MEMBER_STATE[state];
}

/**
 * A member may add to a ticket while a person is still working it.
 *
 * Once it is resolved or closed nobody is reading that queue, so a reply
 * there would be a message into nothing: the thread offers reopen (inside the
 * window) or a new question instead.
 */
export function canMemberReply(status: string): boolean {
  return status === "open" || status === "pending";
}

/** How long after it is resolved a member can reopen a ticket. Mirrors `support_ticket_member_reopen`. */
export const REOPEN_DAYS = 14;

const DAY_MS = 86_400_000;

/**
 * Whether the member can still reopen, and until when.
 *
 * Only a resolved ticket reopens: closed is the team's word that it is done.
 * The database function enforces the same window; this only decides whether
 * to draw the button.
 */
export function reopenWindow(
  status: string,
  resolvedAt: string | null,
  now: number = Date.now(),
): { open: true; until: string } | { open: false } {
  if (status !== "resolved" || !resolvedAt) return { open: false };
  const resolved = Date.parse(resolvedAt);
  if (Number.isNaN(resolved)) return { open: false };
  const until = resolved + REOPEN_DAYS * DAY_MS;
  return now < until ? { open: true, until: new Date(until).toISOString() } : { open: false };
}

export function canRate(status: string): boolean {
  return status === "resolved" || status === "closed";
}

export type ThreadSummary = {
  /** The newest message, or null when the thread holds none yet. */
  last: TicketMessage | null;
  /** How many replies support has written. */
  supportReplies: number;
  /** True when support spoke last, so the next move is the member's. */
  supportSpokeLast: boolean;
  /** When support last wrote, or null. */
  lastSupportAt: string | null;
};

/** Who spoke last and how many times support has answered, in any row order. */
export function summariseThread(messages: readonly TicketMessage[]): ThreadSummary {
  let last: TicketMessage | null = null;
  let supportReplies = 0;
  let lastSupportAt: string | null = null;
  for (const message of messages) {
    if (message.senderRole === "admin") {
      supportReplies += 1;
      if (!lastSupportAt || message.createdAt > lastSupportAt) lastSupportAt = message.createdAt;
    }
    if (!last || message.createdAt > last.createdAt) last = message;
  }
  return { last, supportReplies, supportSpokeLast: last?.senderRole === "admin", lastSupportAt };
}

/**
 * Something from support the member has not opened yet.
 *
 * `member_read_at` is stamped when the member opens the thread; a staff reply
 * after it is unread. A ticket never opened since filing counts every staff
 * reply as unread.
 */
export function hasUnread(lastSupportAt: string | null, memberReadAt: string | null): boolean {
  if (!lastSupportAt) return false;
  if (!memberReadAt) return true;
  return Date.parse(lastSupportAt) > Date.parse(memberReadAt);
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

/**
 * Who a staff reply is from, as the member reads it.
 *
 * First name only, never a surname, email or role inside the company: the
 * member needs to know a person answered and what to call them.
 */
export function staffByline(staffName: string | null | undefined): string {
  const first = staffName?.trim().split(/\s+/)[0];
  return first ? `${first}, Vallo support` : "Vallo support";
}

/**
 * How soon a person answers this ticket, in the words /standards publishes.
 *
 * The grade comes from the topic (`gradeForTopic`), so a safety ticket reads
 * four hours here and runs on the four hour clock in the queue.
 */
export function expectedResponse(topic: string | null): string {
  const commitment = RESPONSE_COMMITMENTS[gradeForTopic(topic)];
  return `A person replies ${commitment.label.toLowerCase()}.`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A ticket id from a URL, checked before it goes anywhere near a query. */
export function isTicketId(value: string): boolean {
  return UUID_RE.test(value);
}
