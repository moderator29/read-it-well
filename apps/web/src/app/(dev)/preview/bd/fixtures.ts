import type { AdminReservationRow } from "@/lib/admin/bookings-queries";
import type { RefundConsole } from "@/lib/admin/money-queries";
import type { SavedMethods } from "@/lib/admin/payments-queries";
import type { AlertView, SubjectLookup } from "@/lib/admin/queries";
import { COUNTERPART, HOTEL, PERSON } from "../_fixtures/people";

/**
 * BD's fixtures: one page of each of the four desks as the queries in this
 * codebase actually shape them. Brand-neutral, the harness's fictional
 * people and the catalogue's fictional restaurants, opaque ids and masked
 * tails only, never an email, a card number, an account number or a
 * document number (rule 16). Never the proof of the writes.
 */

const ADMIN_ID = PERSON.id;
const GUEST_ID = COUNTERPART.id;
const OTHER_GUEST_ID = "00000000-0000-4000-8000-000000000004";
const ROOM_TYPE_ID = "00000000-0000-4000-8000-00000000d002";
const BUSINESS_ID = "00000000-0000-4000-8000-00000000e001";

/** Everything is told relative to one evening, so the clocks never drift. */
const NOW = Date.parse("2026-09-18T21:40:00+01:00");

function ago(minutes: number): string {
  return new Date(NOW - minutes * 60_000).toISOString();
}

function ahead(minutes: number): string {
  return new Date(NOW + minutes * 60_000).toISOString();
}

/* ------------------------------------------------------------ reservations */

export const RESERVATION_REQUESTS: readonly AdminReservationRow[] = [
  {
    id: "00000000-0000-4000-8000-00000000c101",
    status: "PENDING",
    reservedFor: ahead(22 * 60),
    partySize: 4,
    note: "A window table if one is free. It is a birthday.",
    guestId: GUEST_ID,
    guestName: COUNTERPART.name,
    placeName: "The Lagoon Kitchen",
    listingId: null,
    businessId: BUSINESS_ID,
    createdAt: ago(130),
    respondedAt: null,
    past: false,
  },
  {
    id: "00000000-0000-4000-8000-00000000c102",
    status: "PENDING",
    reservedFor: ahead(3 * 24 * 60),
    partySize: 2,
    note: null,
    guestId: OTHER_GUEST_ID,
    guestName: null,
    placeName: "Harbour Lounge",
    listingId: null,
    businessId: BUSINESS_ID,
    createdAt: ago(48),
    respondedAt: null,
    past: false,
  },
];

export const RESERVATION_UPCOMING: readonly AdminReservationRow[] = [
  {
    id: "00000000-0000-4000-8000-00000000c103",
    status: "CONFIRMED",
    reservedFor: ahead(26 * 60),
    partySize: 6,
    note: "Two of us are vegetarian.",
    guestId: GUEST_ID,
    guestName: COUNTERPART.name,
    placeName: "Copper Bar and Grill",
    listingId: null,
    businessId: BUSINESS_ID,
    createdAt: ago(2 * 24 * 60),
    respondedAt: ago(2 * 24 * 60 - 40),
    past: false,
  },
];

export const RESERVATION_PAST: readonly AdminReservationRow[] = [
  {
    id: "00000000-0000-4000-8000-00000000c104",
    status: "CANCELLED",
    reservedFor: ago(26 * 60),
    partySize: 3,
    note: null,
    guestId: OTHER_GUEST_ID,
    guestName: null,
    placeName: "The Lagoon Kitchen",
    listingId: null,
    businessId: BUSINESS_ID,
    createdAt: ago(3 * 24 * 60),
    respondedAt: ago(30 * 60),
    past: true,
  },
  {
    id: "00000000-0000-4000-8000-00000000c105",
    status: "COMPLETED",
    reservedFor: ago(2 * 24 * 60),
    partySize: 2,
    note: null,
    guestId: GUEST_ID,
    guestName: COUNTERPART.name,
    placeName: "Harbour Lounge",
    listingId: null,
    businessId: BUSINESS_ID,
    createdAt: ago(4 * 24 * 60),
    respondedAt: ago(4 * 24 * 60 - 15),
    past: true,
  },
];

/* ------------------------------------------------------------------ alerts */

export const DRIFT_ALERTS: readonly AlertView[] = [
  {
    id: "00000000-0000-4000-8000-00000000c9a1",
    severity: "high",
    status: "open",
    title: "Inventory drift on 3 nights",
    description: `${HOTEL.name}, Lagoon Suite: the calendar shows 2 rooms free on 24 to 26 September and the confirmed bookings leave 0.`,
    entityType: "inventory_drift",
    entityId: ROOM_TYPE_ID,
    createdAt: ago(9 * 60),
    resolvedAt: null,
    resolvedByName: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000c9a2",
    severity: "medium",
    status: "open",
    title: "Inventory drift on 1 night",
    description: `${HOTEL.name}, Garden Room: the calendar shows 0 free on 2 October and the bookings leave 1.`,
    entityType: "inventory_drift",
    entityId: ROOM_TYPE_ID,
    createdAt: ago(3 * 60),
    resolvedAt: null,
    resolvedByName: null,
  },
];

export const RISK_ALERTS: readonly AlertView[] = [
  {
    id: "00000000-0000-4000-8000-00000000c9b1",
    severity: "high",
    status: "open",
    title: "Off-platform payment suggested in a thread",
    description:
      "A message flag was escalated: one party asked the other to pay a deposit by bank transfer outside Vallo.",
    entityType: "message_flag",
    entityId: "00000000-0000-4000-8000-00000000f0a1",
    createdAt: ago(80),
    resolvedAt: null,
    resolvedByName: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000c9b2",
    severity: "medium",
    status: "open",
    title: "Withdrawal held past its window",
    description: "A withdrawal has sat PENDING for 4 hours with no transfer webhook. The hold sweep will release it at 6 hours.",
    entityType: "wallet_entry",
    entityId: "rm-wd-4c0d2f6e-91b3-4a8f-9d2e-6b7c8a9f0e11",
    createdAt: ago(4 * 60),
    resolvedAt: null,
    resolvedByName: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000c9b3",
    severity: "low",
    status: "resolved",
    title: "Webhook signature rejected twice",
    description: "Two Paystack deliveries in a minute failed the signature check and were dropped.",
    entityType: "paystack_webhook",
    entityId: null,
    createdAt: ago(2 * 24 * 60),
    resolvedAt: ago(2 * 24 * 60 - 55),
    resolvedByName: PERSON.name,
  },
];

/* ----------------------------------------------------------------- refunds */

export const REFUNDS: RefundConsole = {
  rows: [
    {
      id: "00000000-0000-4000-8000-00000000b201",
      bookingId: "00000000-0000-4000-8000-00000000b001",
      guestId: GUEST_ID,
      guestName: COUNTERPART.name,
      listingTitle: "Two-bedroom flat, Lekki Phase 1",
      paidMinor: 18_000_000,
      refundMinor: 9_000_000,
      retainedMinor: 9_000_000,
      reason: "guest_choice",
      note: null,
      reference: "rm-refund-7f2e5c11-0f3b-4d6a-8e9c-1b2d3f4a5c6e",
      state: "credited",
      decidedByName: PERSON.name,
      createdAt: ago(3 * 60),
    },
    {
      id: "00000000-0000-4000-8000-00000000b202",
      bookingId: "00000000-0000-4000-8000-00000000b002",
      guestId: OTHER_GUEST_ID,
      guestName: null,
      listingTitle: `${HOTEL.name}, Lagoon Suite`,
      paidMinor: 24_500_000,
      refundMinor: 24_500_000,
      retainedMinor: 0,
      reason: "host_cancelled",
      note: "The host wrote to say the suite is under repair.",
      reference: "rm-refund-9d4f813d-da60-431a-84b0-6a329352ad75",
      state: "not_settled",
      decidedByName: PERSON.name,
      createdAt: ago(7 * 60),
    },
    {
      id: "00000000-0000-4000-8000-00000000b203",
      bookingId: "00000000-0000-4000-8000-00000000b003",
      guestId: GUEST_ID,
      guestName: COUNTERPART.name,
      listingTitle: "Studio, Yaba",
      paidMinor: 6_000_000,
      refundMinor: 6_000_000,
      retainedMinor: 0,
      reason: "no_access",
      note: "The guest waited at the gate for an hour; the caretaker never came.",
      reference: "rm-refund-2a7e5c11-0f3b-4d6a-8e9c-1b2d3f4a5c6f",
      state: "not_credited",
      decidedByName: PERSON.name,
      createdAt: ago(26 * 60),
    },
    {
      id: "00000000-0000-4000-8000-00000000b204",
      bookingId: "00000000-0000-4000-8000-00000000b004",
      guestId: OTHER_GUEST_ID,
      guestName: null,
      listingTitle: "Three-bedroom duplex, Maitama",
      paidMinor: 42_000_000,
      refundMinor: 0,
      retainedMinor: 42_000_000,
      reason: "guest_choice",
      note: null,
      reference: null,
      state: "nothing_owed",
      decidedByName: PERSON.name,
      createdAt: ago(3 * 24 * 60),
    },
  ],
  full: false,
  totals: { refundedMinor: 39_500_000, count: 4, notCredited: 1 },
};

/* ---------------------------------------------------------------- payments */

export const LOOKUP_TERM = `@${COUNTERPART.handle}`;

export const LOOKUP: SubjectLookup = {
  state: "found",
  by: "handle",
  subject: {
    userId: GUEST_ID,
    handle: COUNTERPART.handle,
    displayName: COUNTERPART.name,
  },
};

export const SAVED_METHODS: SavedMethods = {
  cards: [
    {
      id: "00000000-0000-4000-8000-00000000a501",
      cardType: "visa",
      last4: "4821",
      expMonth: 8,
      expYear: 2028,
      bank: "Zenith Bank",
      reusable: true,
      isDefault: true,
      createdAt: ago(40 * 24 * 60),
      removedAt: null,
    },
    {
      id: "00000000-0000-4000-8000-00000000a502",
      cardType: "mastercard",
      last4: "0093",
      expMonth: 2,
      expYear: 2027,
      bank: null,
      reusable: false,
      isDefault: false,
      createdAt: ago(200 * 24 * 60),
      removedAt: ago(12 * 24 * 60),
    },
  ],
  accounts: [
    {
      id: "00000000-0000-4000-8000-00000000a601",
      bankName: "GTBank",
      accountNumberMasked: "••••••0912",
      accountName: COUNTERPART.name.toUpperCase(),
      isDefault: true,
      createdAt: ago(60 * 24 * 60),
      removedAt: null,
    },
  ],
};

/** The admin who is looking, for the pages that name one. */
export const ADMIN = { id: ADMIN_ID, name: PERSON.name };
