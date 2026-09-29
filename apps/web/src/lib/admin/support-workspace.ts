/**
 * THE SUPPORT DESK, AS RULES (29 September 2026).
 *
 * The support desk reads the same four database statuses the member's inbox
 * reads (open, pending, resolved, closed), and none of them says whose move it
 * is or how late we are. Everything the desk draws that is not a column is
 * derived here, purely, so it can be tested without a database:
 *
 *  - THE LANE a ticket sits in: new (nobody on the team has written yet),
 *    waiting on us (the member wrote after our last reply), waiting on the
 *    member (we wrote last; this is the member's "Waiting on you"), escalated
 *    (handed to the money, safety or verification desk and not yet handed
 *    back), or done.
 *  - THE PROMISE a ticket is under. /standards publishes four hours for a
 *    request to pay outside Vallo, anything unsafe, and money somebody has
 *    lost; a day for the rest. So a ticket filed under the safety topic, or
 *    escalated to the money or safety desk, runs on four hours; the rest on
 *    the topic's own grade (lib/trust/support-topics.ts).
 *  - THE CLOCK, from the member's oldest unanswered message
 *    (`waitingSince`, lib/admin/support-rules.ts). A ticket we answered last
 *    has no clock running: nobody is waiting on us.
 *  - THE ORDER: late first (latest first), then the soonest due, then the
 *    rest.
 *  - THE KEYS: the shortcuts the desk answers to.
 *
 * Client-safe: no server imports.
 */

import { countOf } from "@vallo/i18n/core";
import { dueBy, RESPONSE_COMMITMENTS, type ResponseGrade } from "../trust/standards";
import { gradeForTopic } from "../trust/support-topics";
import type { StaffScope } from "./guard";

export type SupportLane = "new" | "waiting_on_us" | "waiting_on_member" | "escalated" | "done";

/** The tabs across the queue, in order. "open" is every lane but done; "mine" is what I hold. */
export const SUPPORT_TABS = ["open", "new", "waiting_on_us", "waiting_on_member", "escalated", "mine", "done"] as const;
export type SupportTab = (typeof SUPPORT_TABS)[number];

export const SUPPORT_TAB_LABEL: Record<SupportTab, string> = {
  open: "All open",
  new: "New",
  waiting_on_us: "Waiting on us",
  waiting_on_member: "Waiting on member",
  escalated: "Escalated",
  mine: "Mine",
  done: "Done",
};

export function isSupportTab(value: unknown): value is SupportTab {
  return typeof value === "string" && (SUPPORT_TABS as readonly string[]).includes(value);
}

/**
 * THE DESKS SUPPORT CAN HAND A TICKET TO, and only these. Support never
 * decides money, safety or identity: it routes them, with a reason, to the
 * desk whose job it is. Compliance is deliberately not a target: a support
 * agent who suspects a compliance matter escalates to safety, and the safety
 * lead decides whether compliance hears of it, so nothing a support agent
 * writes can tip a person off.
 */
export const ESCALATION_TARGETS = ["finance", "moderation", "kyc_review"] as const satisfies readonly StaffScope[];
export type EscalationTarget = (typeof ESCALATION_TARGETS)[number];

export const ESCALATION_TARGET_LABEL: Record<EscalationTarget, { name: string; covers: string }> = {
  finance: {
    name: "Money",
    covers: "A payment that has not arrived, a refund that has not come back, or a charge the member does not recognise.",
  },
  moderation: {
    name: "Safety",
    covers: "Somebody asked to pay outside Vallo, a threat, a scam, or a person who says they are unsafe.",
  },
  kyc_review: {
    name: "Verification",
    covers: "An identity or business check that is stuck, refused, or needs a document looked at.",
  },
};

export function isEscalationTarget(value: unknown): value is EscalationTarget {
  return typeof value === "string" && (ESCALATION_TARGETS as readonly string[]).includes(value);
}

/** The desk a ticket's topic most likely belongs to, to preselect; the agent still chooses. */
export function suggestedEscalation(topic: string | null): EscalationTarget | null {
  if (topic === "safety") return "moderation";
  if (topic === "payment") return "finance";
  if (topic === "verification") return "kyc_review";
  return null;
}

/** An escalation, as the desk needs it. `returnedAt` set means the other desk handed it back. */
export type EscalationLite = { toScope: EscalationTarget; returnedAt: string | null };

export function liveEscalations<T extends EscalationLite>(escalations: readonly T[]): T[] {
  return escalations.filter((e) => e.returnedAt === null);
}

/**
 * The promise the ticket is under. Four hours when the member chose the
 * safety topic or a live escalation sent it to the money or safety desk;
 * otherwise the topic's own grade.
 */
export function ticketGrade(topic: string | null, escalations: readonly EscalationLite[] = []): ResponseGrade {
  if (topic === "safety") return "urgent";
  if (liveEscalations(escalations).some((e) => e.toScope === "finance" || e.toScope === "moderation")) return "urgent";
  return gradeForTopic(topic);
}

export type LaneInput = {
  status: string;
  /** Has anybody on the team written on this ticket? */
  staffReplied: boolean;
  /** The member's oldest unanswered message, or null when we wrote last. */
  waitingSince: string | null;
  escalations: readonly EscalationLite[];
};

export function ticketLane(t: LaneInput): SupportLane {
  if (t.status === "resolved" || t.status === "closed") return "done";
  if (liveEscalations(t.escalations).length > 0) return "escalated";
  if (t.waitingSince === null) return "waiting_on_member";
  if (!t.staffReplied) return "new";
  return "waiting_on_us";
}

export type SlaTone = "danger" | "warning" | "info" | "neutral" | "success";

export type SlaState = {
  /** Null when no clock runs: we answered last, or the ticket is done. */
  dueAt: string | null;
  breached: boolean;
  /** Whole hours late (positive) once breached, whole hours left before. */
  hours: number;
  label: string;
  tone: SlaTone;
  /** The promise itself, as a short word: "4h" or "1 day". */
  promise: string;
  grade: ResponseGrade;
};

function promiseWord(grade: ResponseGrade): string {
  const hours = RESPONSE_COMMITMENTS[grade].hours;
  if (hours < 24) return `${hours}h`;
  return countOf(Math.round(hours / 24), "days");
}

/**
 * The chip on a row and on the open ticket. Whole hours, as the console's
 * other clocks are: a chip counting minutes reads as a countdown to panic,
 * and the promise is made in hours.
 */
export function slaState(input: {
  lane: SupportLane;
  waitingSince: string | null;
  grade: ResponseGrade;
  now?: number;
}): SlaState {
  const promise = promiseWord(input.grade);
  if (input.lane === "done") {
    return { dueAt: null, breached: false, hours: 0, label: "Done", tone: "success", promise, grade: input.grade };
  }
  if (!input.waitingSince) {
    return {
      dueAt: null,
      breached: false,
      hours: 0,
      label: "We answered last",
      tone: "neutral",
      promise,
      grade: input.grade,
    };
  }
  const due = dueBy(input.waitingSince, input.grade, new Date(input.now ?? Date.now()));
  if (due.overdue) {
    const late = Math.max(1, Math.abs(due.hoursLeft));
    return {
      dueAt: due.dueAt.toISOString(),
      breached: true,
      hours: late,
      label: `Late by ${late}h`,
      tone: "danger",
      promise,
      grade: input.grade,
    };
  }
  if (due.hoursLeft < 1) {
    return {
      dueAt: due.dueAt.toISOString(),
      breached: false,
      hours: 0,
      label: "Due within the hour",
      tone: "warning",
      promise,
      grade: input.grade,
    };
  }
  /* A quarter of the window left is the moment to pick it up. */
  const quarter = RESPONSE_COMMITMENTS[input.grade].hours / 4;
  return {
    dueAt: due.dueAt.toISOString(),
    breached: false,
    hours: due.hoursLeft,
    label: `Due in ${due.hoursLeft}h`,
    tone: due.hoursLeft <= quarter ? "warning" : "info",
    promise,
    grade: input.grade,
  };
}

/** The fields the order needs. */
export type Sortable = { lane: SupportLane; sla: SlaState; createdAt: string; lastActivityAt: string };

/**
 * Late first (the latest first), then due soonest, then tickets with no clock
 * (waiting on the member: the longest-quiet first, because those are the ones
 * to nudge or resolve), then done (newest first).
 */
export function compareTickets(a: Sortable, b: Sortable): number {
  const rank = (t: Sortable) => (t.lane === "done" ? 3 : t.sla.breached ? 0 : t.sla.dueAt ? 1 : 2);
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return b.sla.hours - a.sla.hours || a.createdAt.localeCompare(b.createdAt);
  if (ra === 1) return (a.sla.dueAt ?? "").localeCompare(b.sla.dueAt ?? "");
  if (ra === 2) return a.lastActivityAt.localeCompare(b.lastActivityAt);
  return b.lastActivityAt.localeCompare(a.lastActivityAt);
}

export type TabRow = { lane: SupportLane; claimedByMe: boolean };

export function inTab(row: TabRow, tab: SupportTab): boolean {
  if (tab === "open") return row.lane !== "done";
  if (tab === "mine") return row.claimedByMe && row.lane !== "done";
  return row.lane === tab;
}

export function tabCounts(rows: readonly TabRow[]): Record<SupportTab, number> {
  const out = Object.fromEntries(SUPPORT_TABS.map((t) => [t, 0])) as Record<SupportTab, number>;
  for (const row of rows) for (const tab of SUPPORT_TABS) if (inTab(row, tab)) out[tab] += 1;
  return out;
}

/* ------------------------------------------------------------------ keys */

export type ShortcutAction = "next" | "prev" | "next_unclaimed" | "claim" | "reply" | "escalate" | "macros" | "help" | "close";

export const SHORTCUTS: ReadonlyArray<{ key: string; action: ShortcutAction; words: string }> = [
  { key: "j", action: "next", words: "Next ticket" },
  { key: "k", action: "prev", words: "Previous ticket" },
  { key: "n", action: "next_unclaimed", words: "Next ticket nobody holds" },
  { key: "c", action: "claim", words: "Take the open ticket" },
  { key: "r", action: "reply", words: "Write a reply" },
  { key: "m", action: "macros", words: "Pick a saved reply" },
  { key: "e", action: "escalate", words: "Hand to another desk" },
  { key: "?", action: "help", words: "Show these keys" },
  { key: "Escape", action: "close", words: "Close this panel" },
];

export type KeyInput = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  /** The focused element's tag name and whether it is editable. */
  targetTag?: string | null;
  targetEditable?: boolean;
};

/**
 * Which shortcut a key press means, or null. Never while the person is
 * typing (an input, a textarea, a select or anything contenteditable), and
 * never with a modifier, so the browser's own shortcuts are left alone.
 * Escape is the exception to the first rule: it always closes.
 */
export function shortcutFor(input: KeyInput): ShortcutAction | null {
  if (input.metaKey || input.ctrlKey || input.altKey) return null;
  const tag = (input.targetTag ?? "").toUpperCase();
  const typing = input.targetEditable === true || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  if (input.key === "Escape") return "close";
  if (typing) return null;
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  return SHORTCUTS.find((s) => s.key === key)?.action ?? null;
}

/**
 * The ticket the next/previous keys land on, from the ids on screen in
 * order. From nothing selected, "next" is the first.
 */
export function stepTicket(ids: readonly string[], current: string | null, direction: 1 | -1): string | null {
  if (ids.length === 0) return null;
  const at = current ? ids.indexOf(current) : -1;
  if (at < 0) return direction === 1 ? ids[0]! : ids[ids.length - 1]!;
  const next = at + direction;
  if (next < 0 || next >= ids.length) return ids[at]!;
  return ids[next]!;
}

/** The first ticket after the current one (wrapping) that nobody holds and is still open. */
export function nextUnclaimed(
  rows: readonly { id: string; claimed: boolean; lane: SupportLane }[],
  current: string | null,
): string | null {
  const open = rows.filter((r) => !r.claimed && r.lane !== "done" && r.lane !== "waiting_on_member");
  if (open.length === 0) return null;
  const at = current ? rows.findIndex((r) => r.id === current) : -1;
  const after = rows.slice(at + 1).find((r) => !r.claimed && r.lane !== "done" && r.lane !== "waiting_on_member");
  return (after ?? open[0]!).id;
}

/* ------------------------------------------------------------ the view model

   What the desk draws, as data. The real page builds it from the database
   (lib/admin/support-queue.ts); the preview harness builds it from fixtures.
   Either way the desk component sees only this. */

export type SupportQueueRow = {
  id: string;
  reference: string;
  /** The name the member gave when they filed. */
  name: string;
  topic: string | null;
  status: string;
  lane: SupportLane;
  sla: SlaState;
  claim: { name: string | null; mine: boolean } | null;
  escalatedTo: EscalationTarget[];
  createdAt: string;
  lastActivityAt: string;
  replyCount: number;
  /** The first words of what they asked, for the row. */
  preview: string;
  hasAccount: boolean;
};

export type ThreadEntry = { id: string; role: "user" | "admin"; body: string; at: string; by: string | null };

export type EscalationView = {
  id: string;
  toScope: EscalationTarget;
  reason: string;
  by: string;
  byMe: boolean;
  at: string;
  returnedAt: string | null;
  returnedBy: string | null;
  returnNote: string | null;
};

export type SupportMemberContext = {
  /** "db": read through support_member_context. "ticket": only what the ticket carries. */
  source: "db" | "ticket";
  hasAccount: boolean;
  firstName: string | null;
  memberSince: string | null;
  isLister: boolean | null;
  listerVerified: boolean | null;
  badgeTier: string | null;
  bookings: number | null;
  agreements: number | null;
  ticketsTotal: number | null;
  ticketsOpen: number | null;
  recent: { id: string; reference: string; topic: string | null; status: string; createdAt: string }[];
};

export type TrailEntry = { at: string; who: string; what: string; detail: string | null };

export type SupportNote = { id: string; body: string; at: string; author: string; mine: boolean; scopeLabel: string | null };

export type SupportTicketDetail = {
  row: SupportQueueRow;
  email: string;
  body: string;
  kind: string | null;
  related: { kind: string; label: string | null } | null;
  userId: string | null;
  waitingSince: string | null;
  thread: ThreadEntry[];
  /** Null when the escalation door is not installed in this database. */
  escalations: EscalationView[] | null;
  context: SupportMemberContext;
  trail: TrailEntry[] | null;
  /** Null when the ticket has no account to write notes about; "unavailable" when the read failed. */
  notes: SupportNote[] | "unavailable" | null;
  /** The scopes the viewer can restrict a note to. */
  noteScopes: { value: string; label: string }[];
  /** "support": the support desk. "escalated": a holder of the desk it was handed to. */
  mode: "support" | "escalated";
};

/** The words a trail row shows for an audit action. Unknown actions read as themselves. */
export function trailWords(action: string): string {
  switch (action) {
    case "queue.take":
      return "took the ticket";
    case "queue.release":
      return "handed the ticket back to the queue";
    case "queue.assign":
      return "assigned the ticket";
    case "support_ticket.reply":
      return "replied to the member";
    case "support_ticket.status":
      return "changed the status";
    case "support_ticket.escalate":
      return "escalated the ticket";
    case "support_ticket.escalation_return":
      return "handed the ticket back to support";
    default:
      return action.replace(/[._]/g, " ");
  }
}
