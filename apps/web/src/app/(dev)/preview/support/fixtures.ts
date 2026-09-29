import type { MyTickets, TicketAttachment, TicketDetail, TicketSummary } from "@/lib/support/my-tickets";
import type { RelatedRecord } from "@/lib/support/new-query";
import { summariseThread, type TicketMessage } from "@/lib/support/tickets";

/**
 * Invented support tickets for the preview harness. Every name, reference and
 * amount here is made up; nothing is read from a database.
 */

export const NOW = Date.parse("2026-09-29T10:00:00+01:00");
const ago = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

/** A tiny grey square as a data URL, standing in for a signed screenshot link. */
const PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    // eslint-disable-next-line nf/no-raw-colour -- fixture: the pixels of a stand-in screenshot image, not a themed surface
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#8a94a6"/><rect x="24" y="40" width="192" height="24" rx="6" fill="#dfe3ea"/><rect x="24" y="80" width="140" height="16" rx="5" fill="#dfe3ea"/><rect x="24" y="170" width="192" height="40" rx="10" fill="#005fe8"/></svg>',
  );

const waitingMessages: TicketMessage[] = [
  {
    id: "m1",
    senderRole: "user",
    body: "Conversation with the AI helper before this ticket:\nMember: My refund has not arrived\nAI helper: Refunds usually land in 3 to 5 working days. I can pass this to a person.\nMember: I would like to talk to a person.",
    createdAt: ago(26),
  },
  {
    id: "m2",
    senderRole: "admin",
    body: "Thanks for the screenshot. The refund left us on Friday. Could you tell me which bank the card is with, so I can ask them to trace it?",
    createdAt: ago(3),
    staffName: "Amaka",
  },
];

export const WAITING_TICKET: TicketDetail = {
  id: "00000000-0000-4000-8000-00000000a001",
  reference: "VAL-SUP-04821",
  topicCode: "payment",
  topic: "A payment or refund",
  kind: "problem",
  status: "pending",
  body: "I cancelled my stay at the Lekki flat inside the free window but the refund is not on my card yet.",
  createdAt: ago(26),
  resolvedAt: null,
  memberReadAt: ago(20),
  related: { kind: "payment", label: "Payment of ₦184,500, 21 Sept" },
  rating: null,
  ratingComment: null,
};

export const WAITING_MESSAGES = waitingMessages;

export const WAITING_ATTACHMENTS: TicketAttachment[] = [
  { id: "a1", messageId: null, url: PHOTO, width: 240, height: 240 },
];

export const RESOLVED_TICKET: TicketDetail = {
  ...WAITING_TICKET,
  id: "00000000-0000-4000-8000-00000000a002",
  reference: "VAL-SUP-03377",
  topicCode: "verification",
  topic: "Verification",
  kind: "question",
  status: "resolved",
  body: "How long does the ID check take after I upload my card?",
  resolvedAt: ago(30),
  related: null,
};

export const RESOLVED_MESSAGES: TicketMessage[] = [
  {
    id: "r1",
    senderRole: "admin",
    body: "Most checks finish within a day. Yours is done now, and the badge shows on your profile.",
    createdAt: ago(31),
    staffName: "Tunde",
  },
];

function summary(
  id: string,
  reference: string,
  topic: string,
  topicCode: string,
  status: string,
  messages: TicketMessage[],
  unread: boolean,
  createdHoursAgo: number,
): TicketSummary {
  return {
    id,
    reference,
    topic,
    topicCode,
    status,
    createdAt: ago(createdHoursAgo),
    thread: summariseThread(messages),
    unread,
  };
}

export const TICKETS: TicketSummary[] = [
  summary(WAITING_TICKET.id, "VAL-SUP-04821", "A payment or refund", "payment", "pending", waitingMessages, true, 26),
  summary(
    "00000000-0000-4000-8000-00000000a003",
    "VAL-SUP-04790",
    "A booking or stay",
    "booking",
    "open",
    [],
    false,
    5,
  ),
  summary(
    "00000000-0000-4000-8000-00000000a004",
    "VAL-SUP-04512",
    "An inspection",
    "inspection",
    "pending",
    [
      { id: "i1", senderRole: "admin", body: "I have asked the agent to confirm the new time.", createdAt: ago(50) },
      { id: "i2", senderRole: "user", body: "Thank you, Saturday morning works for me.", createdAt: ago(40) },
    ],
    false,
    60,
  ),
  summary(RESOLVED_TICKET.id, "VAL-SUP-03377", "Verification", "verification", "resolved", RESOLVED_MESSAGES, false, 80),
];

export const MY_TICKETS: MyTickets = { state: "ok", tickets: TICKETS };

export const RECORDS: RelatedRecord[] = [
  { kind: "payment", id: "00000000-0000-4000-8000-0000000000p1", label: "Payment of ₦184,500, 21 Sept", sub: "Ref VL-8841 · Refunded" },
  { kind: "booking", id: "00000000-0000-4000-8000-0000000000b1", label: "Lekki Phase 1 flat, 3 Oct to 5 Oct", sub: "Cancelled" },
  { kind: "booking", id: "00000000-0000-4000-8000-0000000000b2", label: "Yaba studio, 18 Oct to 20 Oct", sub: "Confirmed" },
  { kind: "agreement", id: "00000000-0000-4000-8000-0000000000g1", label: "Stay agreement, Lekki Phase 1 flat", sub: "Paid" },
];
