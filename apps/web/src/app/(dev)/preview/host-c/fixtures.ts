import { addDays, rowKey, type CalendarRoom } from "@/lib/host/rate-calendar";
import type { HostRoomBooking } from "@/lib/host/room-bookings";
import type { HostReservationView } from "@/lib/reservations/queries";
import type { HostReview } from "@/lib/host/reviews";
import type { HistoryEntry } from "@/lib/money/history-model";
import type { SyncState } from "@/lib/host/rate-calendar-queries";

/*
 * Invented rows for the preview harness only (never shipped to a real page):
 * an Example hotel with two room types, a month of rows, a few requests,
 * reviews and one month of payments.
 */

export const ROOMS: CalendarRoom[] = [
  {
    id: "00000000-0000-4000-8000-0000000000a1",
    name: "Deluxe double",
    unitsTotal: 4,
    status: "PUBLISHED",
    plans: [{ id: "00000000-0000-4000-8000-0000000000b1", name: "Room only", rateMinor: 4_500_000, active: true, minStayNights: 1, maxStayNights: null }],
  },
  {
    id: "00000000-0000-4000-8000-0000000000a2",
    name: "Executive suite",
    unitsTotal: 2,
    status: "PUBLISHED",
    plans: [
      { id: "00000000-0000-4000-8000-0000000000b2", name: "Bed and breakfast", rateMinor: 9_800_000, active: true, minStayNights: 2, maxStayNights: 14 },
      { id: "00000000-0000-4000-8000-0000000000b3", name: "Room only", rateMinor: 8_900_000, active: true, minStayNights: 1, maxStayNights: null },
    ],
  },
];

export function calendarRows(today: string) {
  const rates: [string, { rateMinor: number | null; closed: boolean }][] = [];
  const inventory: [string, { unitsOpen: number; unitsBooked: number }][] = [];
  const imported: [string, string][] = [];
  const room = ROOMS[0]!;
  const plan = room.plans[0]!;
  for (let i = -10; i < 70; i += 1) {
    const d = addDays(today, i);
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    const booked = i % 9 === 3 ? 4 : i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0;
    if (i < 45) inventory.push([rowKey(room.id, d), { unitsOpen: 4, unitsBooked: booked }]);
    if (dow === 5 || dow === 6) rates.push([rowKey(plan.id, d), { rateMinor: 6_000_000, closed: false }]);
    if (i === 12 || i === 13) rates.push([rowKey(plan.id, d), { rateMinor: null, closed: true }]);
    if (i === 17 || i === 18 || i === 19) imported.push([rowKey(room.id, d), "Airbnb"]);
  }
  return { rates, inventory, imported };
}

export const SYNC_READY: SyncState = {
  ready: true,
  feeds: [{ roomTypeId: ROOMS[0]!.id, token: "3f1c".repeat(16) }],
  imports: [
    {
      id: "00000000-0000-4000-8000-0000000000c1",
      roomTypeId: ROOMS[0]!.id,
      source: "airbnb",
      url: "https://www.airbnb.com/calendar/ical/123.ics?s=x",
      enabled: true,
      lastSyncedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
      lastError: null,
      failures: 0,
      nightsBlocked: 3,
    },
    {
      id: "00000000-0000-4000-8000-0000000000c2",
      roomTypeId: ROOMS[0]!.id,
      source: "booking_com",
      url: "https://admin.booking.com/hotel/ical.html?t=x",
      enabled: true,
      lastSyncedAt: null,
      lastError: "The site did not answer in time. We will try again.",
      failures: 2,
      nightsBlocked: 0,
    },
  ],
};

const hours = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export function roomRequest(id: string, made: number, over: Partial<HostRoomBooking> = {}): HostRoomBooking {
  return {
    id,
    status: "PENDING",
    checkIn: "2026-10-09",
    checkOut: "2026-10-11",
    nights: 2,
    rooms: 1,
    guests: 2,
    totalMinor: 9_000_000,
    createdAt: hours(made),
    hotel: "Example: Marina Court Hotel",
    room: "Deluxe double",
    guestName: "Adaeze Okafor",
    arrivingName: null,
    agreement: null,
    paid: false,
    ...over,
  };
}

export function tableRequest(id: string, inHours: number): HostReservationView {
  return {
    id,
    listingId: null,
    businessId: "00000000-0000-4000-8000-0000000000d1",
    listingTitle: "Example: Terra Kitchen",
    location: "Victoria Island, Lagos",
    reservedFor: new Date(Date.now() + inHours * 3_600_000).toISOString(),
    partySize: 4,
    status: "PENDING",
    note: "A birthday. One guest has a nut allergy.",
    respondedAt: null,
    conversationId: null,
    cancellable: true,
    guestId: "00000000-0000-4000-8000-0000000000e1",
    guestName: "Tunde Bello",
    awaitingAnswer: true,
  };
}

export const REVIEWS: HostReview[] = [
  {
    id: "00000000-0000-4000-8000-0000000000f1",
    accommodationId: "x",
    place: "Example: Marina Court Hotel",
    rating: 5,
    body: "Spotless room, and the generator came on before the lights even flickered. Breakfast was hot at seven.",
    author: "Chioma A.",
    createdAt: hours(30),
    hiddenAt: null,
    hiddenNote: null,
    reply: { body: "Thank you, Chioma. We will tell the kitchen.", at: hours(20) },
    contest: null,
  },
  {
    id: "00000000-0000-4000-8000-0000000000f2",
    accommodationId: "x",
    place: "Example: Marina Court Hotel",
    rating: 2,
    body: "Front desk was slow at check-in. Call the manager on 0803 000 0000 if you want the truth.",
    author: "Musa K.",
    createdAt: hours(80),
    hiddenAt: null,
    hiddenNote: null,
    reply: null,
    contest: { status: "open", criterion: "personal_data", publicNote: null, at: hours(5) },
  },
  {
    id: "00000000-0000-4000-8000-0000000000f3",
    accommodationId: "x",
    place: "Example: Marina Court Hotel",
    rating: 1,
    body: "Offensive words were here.",
    author: "Guest",
    createdAt: hours(300),
    hiddenAt: hours(200),
    hiddenNote: "Removed by Vallo: threats or abuse",
    reply: null,
    contest: { status: "hidden", criterion: "threats", publicNote: "Removed by Vallo: threats or abuse", at: hours(250) },
  },
  {
    id: "00000000-0000-4000-8000-0000000000f4",
    accommodationId: "x",
    place: "Example: Marina Court Hotel",
    rating: 4,
    body: null,
    author: "Ifeoma N.",
    createdAt: hours(500),
    hiddenAt: null,
    hiddenNote: null,
    reply: null,
    contest: null,
  },
];

function earning(id: string, iso: string, gross: number, title: string, ref: string): HistoryEntry {
  const commission = Math.round(gross * 0.1);
  const guarantee = Math.round(gross * 0.02);
  return {
    id,
    kind: "earning",
    occurredAt: iso,
    amountMinor: gross - commission - guarantee,
    direction: "in",
    status: "SUCCESSFUL",
    reference: ref,
    title,
    bookingId: null,
    grossMinor: gross,
    guaranteeMinor: guarantee,
    commissionMinor: commission,
    listerShareMinor: null,
    payerName: null,
    payeeName: null,
  };
}

export const EARNINGS: HistoryEntry[] = [
  earning("s1", "2026-09-04T11:20:00Z", 9_000_000, "Example: Marina Court Hotel", "VAL-8H2K1"),
  earning("s2", "2026-09-12T15:05:00Z", 19_600_000, "Example: Marina Court Hotel", "VAL-9QX44"),
  earning("s3", "2026-09-21T09:40:00Z", 4_500_050, "Example: Marina Court Hotel", "VAL-2MN8Z"),
  {
    id: "s4",
    kind: "reversal",
    occurredAt: "2026-09-23T10:00:00Z",
    amountMinor: 3_960_044,
    direction: "out",
    status: "refunded",
    reference: null,
    title: "Example: Marina Court Hotel",
    bookingId: null,
    grossMinor: -4_500_050,
    guaranteeMinor: -90_001,
    commissionMinor: -450_005,
    listerShareMinor: null,
    payerName: null,
    payeeName: null,
  },
];
