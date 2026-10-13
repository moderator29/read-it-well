import { describe, expect, it } from "vitest";
import type { HostReservationView } from "@/lib/reservations/queries";
import type { HostTableBoard } from "@/app/host/reservations/board";
import { buildRestaurantFigures, buildWeek, lagosDayStart, lagosMonthStart, type WeekRow } from "./restaurant-figures";

/* 18:00 Lagos on Tuesday 13 October 2026. */
const NOW = new Date("2026-10-13T17:00:00.000Z");
const at = (lagos: string) => new Date(`${lagos}+01:00`).toISOString();

function table(id: number, over: Partial<HostReservationView>): HostReservationView {
  return {
    id: `t${id}`,
    listingId: null,
    businessId: "b1",
    listingTitle: "Yellow Chilli",
    location: "Ikoyi",
    reservedFor: at("2026-10-13T20:00:00"),
    partySize: 2,
    status: "PENDING",
    note: null,
    respondedAt: null,
    conversationId: null,
    cancellable: true,
    guestId: `g${id}`,
    guestName: `Guest ${id}`,
    awaitingAnswer: false,
    seating: null,
    bill: null,
    guestRecord: null,
    ...over,
  };
}

function board(rows: HostReservationView[]): HostTableBoard {
  const instant = NOW.getTime();
  const past = (r: HostReservationView) => Date.parse(r.reservedFor) <= instant;
  return {
    requests: rows.filter((r) => r.status === "PENDING" && !past(r)),
    upcoming: rows.filter((r) => r.status === "CONFIRMED" && !past(r)),
    past: rows.filter((r) => r.status === "CANCELLED" || past(r)),
    total: rows.length,
  };
}

const ROWS = [
  table(1, { status: "PENDING", partySize: 4, reservedFor: at("2026-10-13T21:00:00") }),
  table(2, { status: "CONFIRMED", partySize: 6, reservedFor: at("2026-10-13T19:30:00") }),
  table(3, { status: "COMPLETED", partySize: 3, reservedFor: at("2026-10-13T13:00:00") }),
  table(4, { status: "NO_SHOW", partySize: 2, reservedFor: at("2026-10-13T12:30:00") }),
  table(5, { status: "PENDING", partySize: 2, reservedFor: at("2026-10-14T19:00:00") }),
  table(6, { status: "CONFIRMED", partySize: 8, reservedFor: at("2026-10-14T13:00:00") }),
  table(7, { status: "CANCELLED", partySize: 3, reservedFor: at("2026-10-12T20:00:00") }),
];

describe("the restaurant home's figures", () => {
  const f = buildRestaurantFigures({ board: board(ROWS), now: NOW, week: [], noShowsMonth: 3 });

  it("counts tonight's covers at confirmed and seated tables, not at requests or no-shows", () => {
    expect(f.coversExpected).toBe(9);
    expect(f.coverTables).toBe(2);
  });

  it("counts every request still waiting, and how many of them are today's", () => {
    expect(f.toConfirm).toBe(2);
    expect(f.toConfirmToday).toBe(1);
  });

  it("counts the tables seated today and their guests", () => {
    expect(f.seated).toBe(1);
    expect(f.seatedGuests).toBe(3);
  });

  it("lists today's tables soonest first, on the Lagos day", () => {
    expect(f.today).toBe("2026-10-13");
    expect(f.todayTables.map((t) => t.id)).toEqual(["t4", "t3", "t2", "t1"]);
  });

  it("takes the month's no-shows from the count it was given, and leaves it out when there is none", () => {
    expect(f.noShowsMonth).toBe(3);
    expect(buildRestaurantFigures({ board: board(ROWS), now: NOW, week: [], noShowsMonth: null }).noShowsMonth).toBeNull();
  });

  it("says a venue with no tables at all has none, rather than a quiet day", () => {
    const empty = buildRestaurantFigures({ board: board([]), now: NOW, week: [], noShowsMonth: 0 });
    expect(empty.hasTables).toBe(false);
    expect(empty.coversExpected).toBe(0);
    expect(f.hasTables).toBe(true);
  });

  it("switches day at Lagos midnight, not at UTC midnight", () => {
    /* 23:30 UTC on the 13th is 00:30 on the 14th in Lagos. */
    const late = buildRestaurantFigures({ board: board(ROWS), now: new Date("2026-10-13T23:30:00Z"), week: [], noShowsMonth: 0 });
    expect(late.today).toBe("2026-10-14");
  });
});

describe("the seven-day line", () => {
  const rows: WeekRow[] = [
    { reservedFor: at("2026-10-13T19:00:00"), status: "CONFIRMED", partySize: 4 },
    { reservedFor: at("2026-10-13T20:00:00"), status: "PENDING", partySize: 2 },
    { reservedFor: at("2026-10-13T20:30:00"), status: "CANCELLED", partySize: 9 },
    { reservedFor: at("2026-10-13T12:00:00"), status: "NO_SHOW", partySize: 5 },
    { reservedFor: at("2026-10-15T19:00:00"), status: "COMPLETED", partySize: 3 },
    { reservedFor: at("2026-10-19T19:00:00"), status: "CONFIRMED", partySize: 6 },
    /* Outside the seven days: the day before and the day after. */
    { reservedFor: at("2026-10-12T19:00:00"), status: "CONFIRMED", partySize: 7 },
    { reservedFor: at("2026-10-20T19:00:00"), status: "CONFIRMED", partySize: 7 },
  ];
  const week = buildWeek(rows, "2026-10-13");

  it("has seven days from today", () => {
    expect(week.map((p) => p.day)).toEqual([
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
    ]);
  });

  it("counts tables kept or still booked, and leaves out cancelled and no-show", () => {
    expect(week[0]).toEqual({ day: "2026-10-13", bookings: 2, guests: 6 });
    expect(week[2]).toEqual({ day: "2026-10-15", bookings: 1, guests: 3 });
    expect(week[6]).toEqual({ day: "2026-10-19", bookings: 1, guests: 6 });
    expect(week.reduce((n, p) => n + p.bookings, 0)).toBe(4);
  });

  it("puts a late table on its Lagos day even when UTC has already moved on", () => {
    /* 23:30 Lagos on the 13th is 22:30 UTC, the same day; 00:30 Lagos on the
       14th is 23:30 UTC on the 13th. */
    const points = buildWeek(
      [
        { reservedFor: "2026-10-13T22:30:00Z", status: "CONFIRMED", partySize: 2 },
        { reservedFor: "2026-10-13T23:30:00Z", status: "CONFIRMED", partySize: 2 },
      ],
      "2026-10-13",
    );
    expect(points[0]!.bookings).toBe(1);
    expect(points[1]!.bookings).toBe(1);
  });

  it("is null in the figures when the week could not be read", () => {
    expect(buildRestaurantFigures({ board: board(ROWS), now: NOW, week: null, noShowsMonth: 0 }).week).toBeNull();
  });

  it("is an honest row of zeros for a week with nothing booked", () => {
    expect(buildWeek([], "2026-10-13").every((p) => p.bookings === 0 && p.guests === 0)).toBe(true);
  });
});

describe("the Lagos month and day starts", () => {
  it("starts a Lagos month an hour before midnight UTC", () => {
    expect(lagosMonthStart("2026-10-13")).toBe("2026-09-30T23:00:00.000Z");
    expect(lagosDayStart("2026-10-14")).toBe("2026-10-13T23:00:00.000Z");
  });
});
