/**
 * Fixtures for the support desk preview. Invented people and invented
 * tickets only. The lanes, the promise and the clock are computed by the
 * same pure rules the real desk uses (lib/admin/support-workspace.ts), from a
 * fixed clock so every screenshot says the same thing.
 */
import {
  compareTickets,
  slaState,
  ticketGrade,
  ticketLane,
  type EscalationTarget,
  type SupportQueueRow,
  type SupportTicketDetail,
} from "@/lib/admin/support-workspace";
import type { StaffAccess } from "@/lib/admin/guard";

export const NOW = Date.parse("2026-09-29T14:00:00+01:00");
const H = 3_600_000;
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * H).toISOString();

export const STAFF: StaffAccess = {
  isAdmin: false,
  isSuperAdmin: false,
  scopes: ["support"],
  position: "support_agent",
  handbookVersion: "2026-09-29",
  handbookAcknowledged: true,
  consoleVerified: true,
};

type Seed = {
  id: string;
  reference: string;
  name: string;
  topic: string | null;
  status: string;
  filedHoursAgo: number;
  staffReplied: boolean;
  waitingHoursAgo: number | null;
  escalatedTo?: EscalationTarget[];
  claim?: { name: string | null; mine: boolean } | null;
  replies: number;
  preview: string;
  hasAccount?: boolean;
};

const SEEDS: Seed[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    reference: "NF-SUP-7K2Q",
    name: "Amaka Obi",
    topic: "safety",
    status: "open",
    filedHoursAgo: 6,
    staffReplied: false,
    waitingHoursAgo: 6,
    replies: 0,
    preview:
      "The agent for the Lekki flat says I must transfer 150,000 for inspection to his own account before he shows me the place. Is this normal?",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    reference: "NF-SUP-3M8D",
    name: "Tunde Bello",
    topic: "payment",
    status: "pending",
    filedHoursAgo: 30,
    staffReplied: true,
    waitingHoursAgo: 2,
    escalatedTo: ["finance"],
    claim: { name: null, mine: true },
    replies: 3,
    preview: "The booking was cancelled by the host on Friday and the refund has still not reached my card.",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    reference: "NF-SUP-9P4T",
    name: "Hauwa Sani",
    topic: "verification",
    status: "open",
    filedHoursAgo: 20,
    staffReplied: false,
    waitingHoursAgo: 20,
    claim: { name: "Kelechi", mine: false },
    replies: 0,
    preview: "My ID was sent back twice. I uploaded a clear photo both times and I do not understand what is wrong.",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    reference: "NF-SUP-2W6F",
    name: "Chidi Nwosu",
    topic: "booking",
    status: "pending",
    filedHoursAgo: 26,
    staffReplied: true,
    waitingHoursAgo: 23.5,
    replies: 2,
    preview: "The host has not confirmed my dates for next week and I need to know if I should look elsewhere.",
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    reference: "NF-SUP-5R1K",
    name: "Bisi Adeyemi",
    topic: "account",
    status: "pending",
    filedHoursAgo: 50,
    staffReplied: true,
    waitingHoursAgo: null,
    claim: { name: null, mine: true },
    replies: 2,
    preview: "I cannot sign in. The reset email never arrives.",
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    reference: "NF-SUP-8H3N",
    name: "Musa Ibrahim",
    topic: "listing",
    status: "open",
    filedHoursAgo: 1,
    staffReplied: false,
    waitingHoursAgo: 1,
    replies: 0,
    hasAccount: false,
    preview: "How do I list two flats in the same building without making two accounts?",
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    reference: "NF-SUP-4B7C",
    name: "Grace Okafor",
    topic: "agreement",
    status: "resolved",
    filedHoursAgo: 70,
    staffReplied: true,
    waitingHoursAgo: null,
    replies: 4,
    preview: "Where do I find the signed agreement for my rent?",
  },
];

function toRow(s: Seed): SupportQueueRow {
  const escalations = (s.escalatedTo ?? []).map((toScope) => ({ toScope, returnedAt: null }));
  const waitingSince = s.waitingHoursAgo === null ? null : at(s.waitingHoursAgo);
  const lane = ticketLane({ status: s.status, staffReplied: s.staffReplied, waitingSince, escalations });
  return {
    id: s.id,
    reference: s.reference,
    name: s.name,
    topic: s.topic,
    status: s.status,
    lane,
    sla: slaState({ lane, waitingSince, grade: ticketGrade(s.topic, escalations), now: NOW }),
    claim: s.claim ?? null,
    escalatedTo: s.escalatedTo ?? [],
    createdAt: at(s.filedHoursAgo),
    lastActivityAt: at(s.waitingHoursAgo ?? Math.max(0, s.filedHoursAgo - 3)),
    replyCount: s.replies,
    preview: s.preview,
    hasAccount: s.hasAccount ?? true,
  };
}

export const ROWS: SupportQueueRow[] = SEEDS.map(toRow).sort(compareTickets);

export function detailFor(id: string, opts: { escalationsInstalled: boolean; mode?: "support" | "escalated" }): SupportTicketDetail | null {
  const row = ROWS.find((r) => r.id === id);
  if (!row) return null;
  const refund = row.reference === "NF-SUP-3M8D";
  return {
    row,
    email: `${row.name.split(" ")[0]!.toLowerCase()}@example.com`,
    body: refund
      ? "The booking was cancelled by the host on Friday and the refund has still not reached my card. The app says refunded. My bank says nothing arrived. What do I do?"
      : SEEDS.find((s) => s.id === id)!.preview,
    kind: "problem",
    related: refund ? { kind: "booking", label: "Two nights, Yaba studio, 26 to 28 September" } : null,
    userId: row.hasAccount ? "20000000-0000-4000-8000-000000000001" : null,
    waitingSince: row.sla.dueAt ? at(2) : null,
    thread: refund
      ? [
          { id: "m1", role: "admin", body: "Hello Tunde, thank you for writing to us. I am looking into this now and I will reply on this thread, under NF-SUP-3M8D, as soon as I have an answer.", at: at(28), by: "Ifeoma" },
          { id: "m2", role: "user", body: "Thank you. It has been four working days now.", at: at(27), by: null },
          { id: "m3", role: "user", body: "Still nothing today. Can you check with the bank?", at: at(2), by: null },
        ]
      : [],
    escalations: opts.escalationsInstalled
      ? refund
        ? [
            {
              id: "e1",
              toScope: "finance",
              reason: "Refund marked sent by Paystack on 27 September, member's bank says nothing arrived. Please trace the refund reference.",
              by: "Ifeoma",
              byMe: true,
              at: at(1.5),
              returnedAt: null,
              returnedBy: null,
              returnNote: null,
            },
          ]
        : []
      : null,
    context: opts.escalationsInstalled
      ? {
          source: "db",
          hasAccount: row.hasAccount,
          firstName: row.name.split(" ")[0] ?? null,
          memberSince: at(24 * 120),
          isLister: false,
          listerVerified: false,
          badgeTier: null,
          bookings: 3,
          agreements: 0,
          ticketsTotal: 2,
          ticketsOpen: 1,
          recent: [{ id: "10000000-0000-4000-8000-000000000099", reference: "NF-SUP-1A2B", topic: "booking", status: "resolved", createdAt: at(24 * 40) }],
        }
      : {
          source: "ticket",
          hasAccount: row.hasAccount,
          firstName: row.name.split(" ")[0] ?? null,
          memberSince: null,
          isLister: null,
          listerVerified: null,
          badgeTier: null,
          bookings: null,
          agreements: null,
          ticketsTotal: row.hasAccount ? 2 : null,
          ticketsOpen: null,
          recent: [],
        },
    trail: refund
      ? [
          { at: at(1.5), who: "Ifeoma Eze", what: "escalated the ticket", detail: "finance: Refund marked sent by Paystack on 27 September, member's bank says nothing arrived." },
          { at: at(28), who: "Ifeoma Eze", what: "replied to the member", detail: "164 characters" },
          { at: at(28.2), who: "Ifeoma Eze", what: "changed the status", detail: "open to pending" },
          { at: at(28.3), who: "Ifeoma Eze", what: "took the ticket", detail: null },
        ]
      : [],
    notes: row.hasAccount
      ? refund
        ? [{ id: "n1", body: "Called the member on Monday. Bank is GTB. They are calm, just want a date.", at: at(26), author: "Ifeoma Eze", mine: true, scopeLabel: null }]
        : []
      : null,
    noteScopes: [{ value: "support", label: "Support" }],
    mode: opts.mode ?? "support",
  };
}
