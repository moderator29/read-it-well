import type { HostReservationView } from "@/lib/reservations/queries";
import type { SeatingView } from "@/lib/reservations/seating";
import type { HostTableBoard } from "@/app/host/reservations/board";

/**
 * Fixtures for the table desk preview. Made-up rows on a fixed clock; nothing
 * here is written anywhere and nothing is seeded. Stated as a plain type
 * import from the board (never a value import: that module is server-only and
 * pulls the read path in, which took a preview route to a 404 once before).
 */

/** 18:00 Lagos on Tuesday 13 October 2026. */
export const DESK_NOW = new Date("2026-10-13T17:00:00.000Z");

const at = (lagos: string) => new Date(`${lagos}+01:00`).toISOString();

const SEATING: SeatingView = {
  checkInCode: "482913",
  outcome: null,
  outcomeBy: null,
  outcomeAt: null,
  restaurantAnswer: null,
  dinerAskedAt: null,
  dinerAnswer: null,
  disputed: false,
  resolved: false,
};

function table(id: number, over: Partial<HostReservationView>): HostReservationView {
  return {
    id: `00000000-0000-4000-8000-0000000d${String(id).padStart(4, "0")}`,
    listingId: null,
    businessId: "00000000-0000-4000-8000-0000000d9000",
    listingTitle: "Yellow Chilli Ikoyi",
    location: "Ikoyi, Lagos",
    reservedFor: at("2026-10-13T20:00:00"),
    partySize: 2,
    status: "PENDING",
    note: null,
    respondedAt: null,
    conversationId: null,
    cancellable: true,
    guestId: `00000000-0000-4000-8000-0000000d${String(id + 500).padStart(4, "0")}`,
    guestName: "Vallo guest",
    awaitingAnswer: false,
    seating: null,
    bill: null,
    guestRecord: null,
    ...over,
  };
}

const ROWS: HostReservationView[] = [
  table(1, {
    status: "PENDING",
    reservedFor: at("2026-10-13T21:00:00"),
    partySize: 4,
    guestName: "Tunde Bakare",
    awaitingAnswer: true,
    note: "One of us cannot have peanuts. We may be fifteen minutes late from Victoria Island.",
    conversationId: "00000000-0000-4000-8000-0000000d8001",
    guestRecord: { kept: 4, missed: 1 },
  }),
  table(2, {
    status: "PENDING",
    reservedFor: at("2026-10-13T20:30:00"),
    partySize: 2,
    guestName: "Ifeoma Nwosu",
    awaitingAnswer: true,
  }),
  table(3, {
    status: "CONFIRMED",
    reservedFor: at("2026-10-13T19:30:00"),
    partySize: 6,
    guestName: "Chidi Okonkwo",
    note: "A birthday. A high chair if you have one.",
    conversationId: "00000000-0000-4000-8000-0000000d8003",
    seating: SEATING,
    cancellable: true,
  }),
  table(4, {
    status: "CONFIRMED",
    reservedFor: at("2026-10-13T20:00:00"),
    partySize: 3,
    guestName: "Aisha Lawal",
    seating: { ...SEATING, checkInCode: "771204" },
  }),
  table(5, {
    status: "COMPLETED",
    reservedFor: at("2026-10-13T13:00:00"),
    partySize: 3,
    guestName: "Kemi Adeyemi",
    seating: { ...SEATING, checkInCode: "220918", outcome: "SEATED", outcomeBy: "code" },
    cancellable: false,
  }),
  table(6, {
    status: "NO_SHOW",
    reservedFor: at("2026-10-13T12:30:00"),
    partySize: 2,
    guestName: "Emeka Obi",
    seating: { ...SEATING, checkInCode: "601337", outcome: "NO_SHOW", outcomeBy: "restaurant", restaurantAnswer: "NO_SHOW" },
    cancellable: false,
  }),
  table(7, {
    status: "PENDING",
    reservedFor: at("2026-10-14T19:00:00"),
    partySize: 2,
    guestName: "Zainab Bello",
    awaitingAnswer: true,
    guestRecord: { kept: 7, missed: 0 },
  }),
  table(8, {
    status: "CONFIRMED",
    reservedFor: at("2026-10-14T13:00:00"),
    partySize: 8,
    guestName: "Bayo Adebayo",
    note: "Work lunch. We would like the quiet corner if it is free.",
  }),
  table(9, {
    status: "PENDING",
    reservedFor: at("2026-10-16T20:00:00"),
    partySize: 5,
    guestName: "Ngozi Eze",
    awaitingAnswer: true,
    guestRecord: { kept: 0, missed: 2 },
  }),
  table(10, {
    status: "CANCELLED",
    reservedFor: at("2026-10-12T20:00:00"),
    partySize: 3,
    guestName: "Musa Abdullahi",
    cancellable: false,
  }),
  table(11, {
    status: "COMPLETED",
    reservedFor: at("2026-10-11T19:00:00"),
    partySize: 2,
    guestName: "Funke Akindele",
    seating: { ...SEATING, checkInCode: "390551", outcome: "SEATED", outcomeBy: "code" },
    cancellable: false,
  }),
];

/** The board as the route would hand it over, split by the same rule as `readHostTableBoard`. */
export function deskFixture(): HostTableBoard {
  const instant = DESK_NOW.getTime();
  const past = (row: HostReservationView) => Date.parse(row.reservedFor) <= instant;
  return {
    requests: ROWS.filter((row) => row.status === "PENDING" && !past(row)),
    upcoming: ROWS.filter((row) => row.status === "CONFIRMED" && !past(row)),
    past: ROWS.filter((row) => row.status === "CANCELLED" || past(row)).sort((a, b) =>
      b.reservedFor.localeCompare(a.reservedFor),
    ),
    total: ROWS.length,
  };
}

export const DESK_EMPTY: HostTableBoard = { requests: [], upcoming: [], past: [], total: 0 };
