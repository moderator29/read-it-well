import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, STAFF_SCOPE_LABEL, STAFF_SCOPES, type AdminAccess, type StaffScope } from "./guard";
import { claimIsLive } from "./queue-desk";
import { isUserId, personName } from "./member-file-rules";
import { orSafe } from "./queue-filter";
import { readMemberNotes } from "./notes";
import { waitingSince } from "./support-rules";
import {
  compareTickets,
  ESCALATION_TARGETS,
  isEscalationTarget,
  slaState,
  ticketGrade,
  ticketLane,
  trailWords,
  type EscalationTarget,
  type EscalationView,
  type SupportMemberContext,
  type SupportQueueRow,
  type SupportTicketDetail,
  type TrailEntry,
} from "./support-workspace";

/**
 * THE SUPPORT DESK'S READS (29 September 2026).
 *
 * Every read here starts at `requireAdmin("support")` (or, for one ticket,
 * the desk it was escalated to, proved by the database) and reads only the
 * ticket and what the ticket needs:
 *
 *  - the queue: every open ticket with the lane, the promise and the clock
 *    derived in `support-workspace.ts`, who holds it, and where it was
 *    escalated; plus the last forty done;
 *  - one ticket: the thread with who on the team wrote each reply, the
 *    escalations, the member context (through `support_member_context`,
 *    which answers only what support needs; until that function is installed,
 *    only what the ticket itself carries), the internal notes (through the
 *    notes functions on the operator's own session, which apply the key
 *    proof and the note's scope), and the audit trail of this ticket.
 *
 * Nothing here reads a document, an address, a TIN, a CAC number, a bank
 * account, an amount of money or anything from the compliance desk. A
 * support-scoped staff member holds no admin role, so the tables' admin
 * policies would refuse their own client: the rows are read with the client
 * `requireAdmin` handed out, and only after it said yes.
 */

type Loose = SupabaseClient;
type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

const OPEN_LIMIT = 200;
const DONE_LIMIT = 40;

/** A table or function this database does not have yet (a pending migration). */
export function isNotInstalled(error: unknown): boolean {
  const code = String((error as { code?: unknown } | null)?.code ?? "");
  return code === "PGRST202" || code === "PGRST205" || code === "42P01" || code === "42883";
}

type TicketRow = {
  id: string;
  reference: string;
  name: string;
  email: string;
  topic: string | null;
  kind: string | null;
  body: string;
  status: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  related_kind: string | null;
  related_label: string | null;
  support_ticket_messages: { id: string; sender_role: string; sender_id: string | null; created_at: string }[];
};

const TICKET_COLUMNS =
  "id, reference, name, email, topic, kind, body, status, user_id, created_at, updated_at, related_kind, related_label, support_ticket_messages ( id, sender_role, sender_id, created_at )";

type Claim = { item_id: string; claimed_by: string; touched_at: string };
type EscRow = { ticket_id: string; to_scope: string };

function escalationsByTicket(rows: EscRow[]): Map<string, EscalationTarget[]> {
  const out = new Map<string, EscalationTarget[]>();
  for (const r of rows) {
    if (!isEscalationTarget(r.to_scope)) continue;
    out.set(r.ticket_id, [...(out.get(r.ticket_id) ?? []), r.to_scope]);
  }
  return out;
}

function toRow(
  t: TicketRow,
  ctx: { now: number; me: string; claims: Map<string, Claim>; names: Map<string, string>; escalated: Map<string, EscalationTarget[]> },
): SupportQueueRow {
  const msgs = t.support_ticket_messages ?? [];
  const waiting = waitingSince(
    t.created_at,
    msgs.map((m) => ({ role: m.sender_role, at: m.created_at })),
  );
  const escalatedTo = ctx.escalated.get(t.id) ?? [];
  const escalations = escalatedTo.map((toScope) => ({ toScope, returnedAt: null }));
  const lane = ticketLane({
    status: t.status,
    staffReplied: msgs.some((m) => m.sender_role === "admin"),
    waitingSince: waiting,
    escalations,
  });
  const claim = ctx.claims.get(t.id);
  const live = claim && claimIsLive(claim.touched_at, ctx.now) ? claim : null;
  const last = msgs.reduce((acc, m) => (m.created_at > acc ? m.created_at : acc), t.created_at);
  return {
    id: t.id,
    reference: t.reference,
    name: t.name,
    topic: t.topic,
    status: t.status,
    lane,
    sla: slaState({ lane, waitingSince: waiting, grade: ticketGrade(t.topic, escalations), now: ctx.now }),
    claim: live ? { name: ctx.names.get(live.claimed_by) ?? null, mine: live.claimed_by === ctx.me } : null,
    escalatedTo,
    createdAt: t.created_at,
    lastActivityAt: last,
    replyCount: msgs.length,
    preview: t.body.replace(/\s+/g, " ").trim().slice(0, 160),
    hasAccount: t.user_id !== null,
  };
}

export type SupportQueue = {
  rows: SupportQueueRow[];
  /** False while the escalation migration is pending. */
  escalationsInstalled: boolean;
};

export type SupportRead<T> = { state: "ok"; data: T } | { state: "unavailable" } | { state: "forbidden" };

/** Reads the side tables (claims, names, escalations) for a set of tickets. */
async function around(db: Loose, tickets: TicketRow[]) {
  const ids = tickets.map((t) => t.id);
  if (ids.length === 0) {
    return { claims: new Map<string, Claim>(), names: new Map<string, string>(), escalated: new Map(), installed: true };
  }
  const [claims, esc] = await Promise.all([
    db.from("queue_claims").select("item_id, claimed_by, touched_at").eq("kind", "ticket").in("item_id", ids),
    db.from("support_ticket_escalations").select("ticket_id, to_scope").in("ticket_id", ids).is("returned_at", null),
  ]);
  const claimRows = (claims.error ? [] : (claims.data ?? [])) as Claim[];
  const installed = !(esc.error && isNotInstalled(esc.error));
  const escRows = (esc.error ? [] : (esc.data ?? [])) as EscRow[];
  const staffIds = [...new Set(claimRows.map((c) => c.claimed_by))];
  const names = new Map<string, string>();
  if (staffIds.length) {
    const { data } = await db.from("profiles").select("id, display_name, first_name, surname").in("id", staffIds);
    for (const p of (data ?? []) as { id: string; display_name: string | null; first_name: string | null; surname: string | null }[]) {
      const n = personName(p);
      if (n) names.set(p.id, n);
    }
  }
  return {
    claims: new Map(claimRows.map((c) => [c.item_id, c])),
    names,
    escalated: escalationsByTicket(escRows),
    installed,
  };
}

/**
 * THE QUEUE. Every open ticket (up to 200, oldest waiting first once sorted)
 * and the last forty done. `q` narrows by reference or email, the two things
 * a member on the phone can read out.
 */
export async function getSupportQueue(input: { q?: string | null; now?: number } = {}): Promise<SupportRead<SupportQueue>> {
  const access = await requireAdmin("support");
  if (access.state !== "admin") return { state: "forbidden" };
  const now = input.now ?? Date.now();
  const db = access.supabase as unknown as Loose;
  const term = (input.q ?? "").replace(/[,()*"\\%]/g, "").trim().slice(0, 80);
  try {
    const base = () => {
      let s = db.from("support_tickets").select(TICKET_COLUMNS);
      if (term) s = s.or(`reference.ilike.${orSafe(`%${term}%`)},email.ilike.${orSafe(`%${term}%`)}`);
      return s;
    };
    const [open, done] = await Promise.all([
      base().in("status", ["open", "pending"]).order("created_at", { ascending: true }).limit(OPEN_LIMIT),
      base().in("status", ["resolved", "closed"]).order("updated_at", { ascending: false }).limit(DONE_LIMIT),
    ]);
    if (open.error || done.error) return { state: "unavailable" };
    const tickets = [...((open.data ?? []) as TicketRow[]), ...((done.data ?? []) as TicketRow[])];
    const side = await around(db, tickets);
    const rows = tickets
      .map((t) => toRow(t, { now, me: access.user.id, ...side }))
      .sort(compareTickets);
    return { state: "ok", data: { rows, escalationsInstalled: side.installed } };
  } catch {
    return { state: "unavailable" };
  }
}

/* ------------------------------------------------------------- one ticket */

export type TicketDoor =
  | { mode: "support"; access: Extract<AdminAccess, { state: "admin" }> }
  | { mode: "escalated"; scope: EscalationTarget; access: Extract<AdminAccess, { state: "admin" }> }
  | { mode: "none"; state: Exclude<AdminAccess["state"], "admin"> | "not-admin" };

/**
 * Who may open this ticket: the support desk, or a holder of the desk it was
 * escalated to (the database says which, through
 * `support_ticket_escalations_for` on the caller's own session, so the key
 * proof and the scope are checked there too). Anybody else: none.
 */
export async function ticketDoor(ticketId: string): Promise<TicketDoor> {
  const support = await requireAdmin("support");
  if (support.state === "admin") return { mode: "support", access: support };
  if (support.state !== "not-admin") return { mode: "none", state: support.state };
  if (!isUserId(ticketId)) return { mode: "none", state: "not-admin" };
  for (const scope of ESCALATION_TARGETS) {
    const access = await requireAdmin(scope);
    if (access.state !== "admin") continue;
    const { data, error } = await (access.userClient as unknown as RpcClient).rpc("support_ticket_escalations_for", {
      p_ticket: ticketId,
    });
    if (error || !Array.isArray(data)) continue;
    const live = (data as { to_scope?: string; returned_at?: string | null }[]).some(
      (r) => r.to_scope === scope && !r.returned_at,
    );
    if (live) return { mode: "escalated", scope, access };
  }
  return { mode: "none", state: "not-admin" };
}

async function readEscalations(client: unknown, ticketId: string): Promise<EscalationView[] | null | "unavailable"> {
  const { data, error } = await (client as RpcClient).rpc("support_ticket_escalations_for", { p_ticket: ticketId });
  if (error) return isNotInstalled(error) ? null : "unavailable";
  return ((data ?? []) as Record<string, unknown>[])
    .filter((r) => isEscalationTarget(r.to_scope))
    .map((r) => ({
      id: String(r.id),
      toScope: r.to_scope as EscalationTarget,
      reason: String(r.reason ?? ""),
      by: String(r.escalated_by_name ?? "A colleague"),
      byMe: r.escalated_by_me === true,
      at: String(r.escalated_at),
      returnedAt: (r.returned_at as string | null) ?? null,
      returnedBy: (r.returned_by_name as string | null) ?? null,
      returnNote: (r.return_note as string | null) ?? null,
    }));
}

const num = (v: unknown): number | null => (typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : null);

async function readContext(client: unknown, ticket: TicketRow, otherTickets: SupportMemberContext["recent"]): Promise<SupportMemberContext> {
  const fallback: SupportMemberContext = {
    source: "ticket",
    hasAccount: ticket.user_id !== null,
    firstName: ticket.name.trim().split(/\s+/)[0] ?? null,
    memberSince: null,
    isLister: null,
    listerVerified: null,
    badgeTier: null,
    bookings: null,
    agreements: null,
    ticketsTotal: ticket.user_id ? otherTickets.length + 1 : null,
    ticketsOpen: null,
    recent: otherTickets,
  };
  try {
    const { data, error } = await (client as RpcClient).rpc("support_member_context", { p_ticket: ticket.id });
    if (error || !data || typeof data !== "object") return fallback;
    const d = data as Record<string, unknown>;
    if (d.status !== "ok") return fallback;
    if (d.has_account !== true) return { ...fallback, source: "db", hasAccount: false };
    const recent = Array.isArray(d.recent_tickets)
      ? (d.recent_tickets as Record<string, unknown>[]).map((r) => ({
          id: String(r.id),
          reference: String(r.reference ?? ""),
          topic: (r.topic as string | null) ?? null,
          status: String(r.status ?? ""),
          createdAt: String(r.created_at ?? ""),
        }))
      : otherTickets;
    return {
      source: "db",
      hasAccount: true,
      firstName: (d.first_name as string | null) ?? fallback.firstName,
      memberSince: (d.member_since as string | null) ?? null,
      isLister: d.is_lister === true,
      listerVerified: d.lister_verified === true,
      badgeTier: (d.badge_tier as string | null) ?? null,
      bookings: num(d.bookings),
      agreements: num(d.agreements),
      ticketsTotal: num(d.tickets_total),
      ticketsOpen: num(d.tickets_open),
      recent,
    };
  } catch {
    return fallback;
  }
}

const TRAIL_ACTIONS = [
  "queue.take",
  "queue.release",
  "queue.assign",
  "support_ticket.reply",
  "support_ticket.status",
  "support_ticket.escalate",
  "support_ticket.escalation_return",
];

async function readTrail(db: Loose, ticketId: string): Promise<TrailEntry[] | null> {
  const { data, error } = await db
    .from("audit_log")
    .select("actor_id, action, entity_type, metadata, created_at")
    .eq("entity_id", ticketId)
    .in("action", TRAIL_ACTIONS)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return null;
  const rows = (data ?? []) as { actor_id: string | null; action: string; entity_type: string; metadata: Record<string, unknown> | null; created_at: string }[];
  const ids = [...new Set(rows.map((r) => r.actor_id).filter((v): v is string => Boolean(v)))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: people } = await db.from("profiles").select("id, display_name, first_name, surname").in("id", ids);
    for (const p of (people ?? []) as { id: string; display_name: string | null; first_name: string | null; surname: string | null }[]) {
      const n = personName(p);
      if (n) names.set(p.id, n);
    }
  }
  return rows
    .filter((r) => r.entity_type === "support_ticket" || r.entity_type === "ticket")
    .map((r) => {
      const m = r.metadata ?? {};
      let detail: string | null = null;
      if (r.action === "support_ticket.status") {
        detail = `${String(m.before_status ?? "")} to ${String(m.after_status ?? "")}`;
        if (m.closing_note) detail += `: ${String(m.closing_note)}`;
      } else if (r.action === "support_ticket.escalate") {
        const to = String(m.to_scope ?? "");
        detail = `${isEscalationTarget(to) ? to : "another desk"}: ${String(m.reason ?? "")}`;
      } else if (r.action === "support_ticket.escalation_return") {
        detail = String(m.note ?? "") || null;
      } else if (r.action === "support_ticket.reply" && typeof m.characters === "number") {
        detail = `${m.characters} characters`;
      }
      return {
        at: r.created_at,
        who: (r.actor_id && names.get(r.actor_id)) || "A colleague",
        what: trailWords(r.action),
        detail,
      };
    });
}

/**
 * ONE TICKET, with everything the open ticket shows. `row` comes from the
 * queue when the ticket is on it; otherwise it is built here.
 */
export async function getSupportTicketDetail(
  ticketId: string,
  now: number = Date.now(),
): Promise<SupportRead<SupportTicketDetail | null>> {
  if (!isUserId(ticketId)) return { state: "ok", data: null };
  const door = await ticketDoor(ticketId);
  if (door.mode === "none") return { state: "forbidden" };
  const { access } = door;
  const db = access.supabase as unknown as Loose;
  try {
    const { data, error } = await db.from("support_tickets").select(TICKET_COLUMNS).eq("id", ticketId).maybeSingle();
    if (error) return { state: "unavailable" };
    if (!data) return { state: "ok", data: null };
    const ticket = data as TicketRow;

    const [messages, escalations, others, side] = await Promise.all([
      db
        .from("support_ticket_messages")
        .select("id, sender_role, sender_id, body, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true })
        .limit(200),
      readEscalations(access.userClient, ticketId),
      ticket.user_id
        ? db
            .from("support_tickets")
            .select("id, reference, topic, status, created_at")
            .eq("user_id", ticket.user_id)
            .neq("id", ticketId)
            .order("created_at", { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
      around(db, [ticket]),
    ]);
    if (messages.error) return { state: "unavailable" };
    const msgs = (messages.data ?? []) as { id: string; sender_role: string; sender_id: string | null; body: string; created_at: string }[];

    const staffIds = [...new Set(msgs.filter((m) => m.sender_role === "admin" && m.sender_id).map((m) => m.sender_id as string))];
    const staffNames = new Map<string, string>();
    if (staffIds.length) {
      const { data: people } = await db.from("profiles").select("id, display_name, first_name, surname").in("id", staffIds);
      for (const p of (people ?? []) as { id: string; display_name: string | null; first_name: string | null; surname: string | null }[]) {
        const n = personName(p);
        if (n) staffNames.set(p.id, n);
      }
    }

    const liveEsc = Array.isArray(escalations) ? escalations.filter((e) => !e.returnedAt).map((e) => e.toScope) : [];
    const row = toRow(ticket, {
      now,
      me: access.user.id,
      claims: side.claims,
      names: side.names,
      escalated: new Map([[ticket.id, liveEsc.length ? liveEsc : (side.escalated.get(ticket.id) ?? [])]]),
    });

    const otherTickets = ((others.data ?? []) as { id: string; reference: string; topic: string | null; status: string; created_at: string }[]).map(
      (o) => ({ id: o.id, reference: o.reference, topic: o.topic, status: o.status, createdAt: o.created_at }),
    );

    const [context, trail, notesRead] = await Promise.all([
      readContext(access.userClient, ticket, otherTickets),
      readTrail(db, ticketId),
      ticket.user_id ? readMemberNotes(ticket.user_id) : Promise.resolve(null),
    ]);

    const held: StaffScope[] = access.isStaff
      ? (STAFF_SCOPES.filter((s) => s === "support" || (door.mode === "escalated" && s === door.scope)) as StaffScope[])
      : [...STAFF_SCOPES];

    return {
      state: "ok",
      data: {
        row,
        email: ticket.email,
        body: ticket.body,
        kind: ticket.kind,
        related: ticket.related_kind ? { kind: ticket.related_kind, label: ticket.related_label } : null,
        userId: ticket.user_id,
        waitingSince: waitingSince(
          ticket.created_at,
          msgs.map((m) => ({ role: m.sender_role, at: m.created_at })),
        ),
        thread: msgs.map((m) => ({
          id: m.id,
          role: m.sender_role === "admin" ? "admin" : "user",
          body: m.body,
          at: m.created_at,
          by: m.sender_role === "admin" && m.sender_id ? (staffNames.get(m.sender_id) ?? null) : null,
        })),
        escalations: escalations === "unavailable" ? [] : escalations,
        context,
        trail,
        notes:
          notesRead === null
            ? null
            : notesRead.state !== "ok"
              ? "unavailable"
              : notesRead.notes.map((n) => ({
                  id: n.id,
                  body: n.body,
                  at: n.createdAt,
                  author: n.author,
                  mine: n.mine,
                  scopeLabel: n.scope ? STAFF_SCOPE_LABEL[n.scope] : null,
                })),
        noteScopes: held.map((s) => ({ value: s, label: STAFF_SCOPE_LABEL[s] })),
        mode: door.mode,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
