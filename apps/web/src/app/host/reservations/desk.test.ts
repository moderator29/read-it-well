import { describe, expect, it } from "vitest";

import type { HostReservationView } from "@/lib/reservations/queries";
import type { HostTableBoard } from "./board";
import { buildDesk, filterDesk, lagosDay, longDayLabel, matchesSearch } from "./desk";

/**
 * The table desk, arranged: today with its four figures, the days ahead by
 * day, and what has gone, on the Lagos clock. Every figure is a count of rows
 * on the same screen, so each is pinned here against a known board.
 */

/* 18:00 Lagos on Tuesday 13 October 2026 (Lagos is UTC+1 all year). */
const NOW = new Date("2026-10-13T17:00:00.000Z");
const at = (lagos: string) => new Date(`${lagos}+01:00`).toISOString();

function row(id: string, over: Partial<HostReservationView>): HostReservationView {
  return {
    id,
    listingId: null,
    businessId: "b-1",
    listingTitle: "Yellow Chilli Ikoyi",
    location: "Ikoyi, Lagos",
    reservedFor: at("2026-10-13T20:00:00"),
    partySize: 2,
    status: "PENDING",
    note: null,
    respondedAt: null,
    conversationId: null,
    cancellable: true,
    guestId: `g-${id}`,
    guestName: "Vallo guest",
    awaitingAnswer: false,
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

const DAY = [
  row("req-tonight", { status: "PENDING", reservedFor: at("2026-10-13T21:00:00"), partySize: 4 }),
  row("conf-tonight", { status: "CONFIRMED", reservedFor: at("2026-10-13T19:30:00"), partySize: 6 }),
  row("seated-lunch", { status: "COMPLETED", reservedFor: at("2026-10-13T13:00:00"), partySize: 3 }),
  row("noshow-lunch", { status: "NO_SHOW", reservedFor: at("2026-10-13T12:30:00"), partySize: 2 }),
  row("unmarked-lunch", { status: "CONFIRMED", reservedFor: at("2026-10-13T14:00:00"), partySize: 2 }),
  row("lapsed-request", { status: "PENDING", reservedFor: at("2026-10-13T12:00:00"), partySize: 2 }),
  row("called-off", { status: "CANCELLED", reservedFor: at("2026-10-13T20:30:00"), partySize: 5 }),
  row("req-tomorrow", { status: "PENDING", reservedFor: at("2026-10-14T19:00:00"), partySize: 2 }),
  row("conf-tomorrow", { status: "CONFIRMED", reservedFor: at("2026-10-14T13:00:00"), partySize: 8 }),
  row("req-friday", { status: "PENDING", reservedFor: at("2026-10-16T20:00:00"), partySize: 2 }),
  row("last-week", { status: "COMPLETED", reservedFor: at("2026-10-06T20:00:00"), partySize: 2 }),
  row("yesterday", { status: "CONFIRMED", reservedFor: at("2026-10-12T20:00:00"), partySize: 2 }),
];

describe("lagosDay", () => {
  it("cuts the day on the Lagos clock, not UTC", () => {
    /* 23:30 UTC on the 13th is 00:30 on the 14th in Lagos. */
    expect(lagosDay("2026-10-13T23:30:00.000Z")).toBe("2026-10-14");
    expect(lagosDay("2026-10-13T22:59:00.000Z")).toBe("2026-10-13");
    expect(lagosDay("not a date")).toBe("");
  });

  it("names the header's day on the Lagos clock", () => {
    expect(longDayLabel(new Date("2026-10-13T23:30:00.000Z"))).toContain("14 October");
  });
});

describe("buildDesk", () => {
  const desk = buildDesk(board(DAY), NOW);

  it("lists today's tables in time order, whatever their state", () => {
    expect(desk.today).toBe("2026-10-13");
    expect(desk.todayTables.map((t) => t.id)).toEqual([
      "lapsed-request",
      "noshow-lunch",
      "seated-lunch",
      "unmarked-lunch",
      "conf-tonight",
      "called-off",
      "req-tonight",
    ]);
  });

  it("counts covers expected over today's confirmed and seated tables only", () => {
    /* 6 (tonight) + 3 (seated) + 2 (unmarked lunch); never a request, a no-show or a cancellation. */
    expect(desk.figures.coversExpected).toBe(11);
    expect(desk.figures.coverTables).toBe(3);
  });

  it("counts requests to confirm today, and those waiting on later days", () => {
    expect(desk.figures.toConfirm).toBe(1);
    expect(desk.figures.toConfirmLater).toBe(2);
  });

  it("counts seated and done from the marks the venue made", () => {
    expect(desk.figures.seated).toBe(1);
    expect(desk.figures.seatedGuests).toBe(3);
    /* Done is marked seated or no-show, of today's booked tables. */
    expect(desk.figures.done).toBe(2);
    expect(desk.figures.booked).toBe(4);
  });

  it("only offers an answer on a request whose time is still ahead", () => {
    const byId = new Map(desk.todayTables.map((t) => [t.id, t]));
    expect(byId.get("req-tonight")?.decidable).toBe(true);
    expect(byId.get("lapsed-request")?.decidable).toBe(false);
    expect(byId.get("unmarked-lunch")?.passed).toBe(true);
    expect(byId.get("conf-tonight")?.passed).toBe(false);
  });

  it("groups the days ahead by Lagos day, soonest first, with their live tables and guests", () => {
    expect(desk.upcoming.map((g) => g.day)).toEqual(["2026-10-14", "2026-10-16"]);
    expect(desk.upcoming[0]!.tables.map((t) => t.id)).toEqual(["conf-tomorrow", "req-tomorrow"]);
    expect(desk.upcoming[0]!.live).toBe(2);
    expect(desk.upcoming[0]!.guests).toBe(10);
  });

  it("puts what has gone before today in Earlier, newest first", () => {
    expect(desk.earlier.map((t) => t.id)).toEqual(["yesterday", "last-week"]);
    expect(desk.count).toBe(DAY.length);
  });

  it("files a table just after Lagos midnight under the next day", () => {
    const late = buildDesk(
      board([row("midnight", { status: "CONFIRMED", reservedFor: "2026-10-13T23:30:00.000Z" })]),
      NOW,
    );
    expect(late.todayTables).toEqual([]);
    expect(late.upcoming[0]!.day).toBe("2026-10-14");
  });

  it("draws an empty day as zeros, not as missing figures", () => {
    const empty = buildDesk({ requests: [], upcoming: [], past: [], total: 0 }, NOW);
    expect(empty.figures).toEqual({
      coversExpected: 0,
      coverTables: 0,
      toConfirm: 0,
      toConfirmLater: 0,
      seated: 0,
      seatedGuests: 0,
      done: 0,
      booked: 0,
    });
  });
});

describe("search", () => {
  const named = [
    row("a", { guestName: "Tunde Bakare", note: "One of us cannot have peanuts." }),
    row("b", { guestName: "Ifeoma Nwosu", partySize: 4 }),
    row("c", { guestName: "Zainab Bello", listingTitle: "Terra Kulture" }),
    row("d", { guestName: "Chidì Okonkwo" }),
  ];

  it("finds a guest by name, a note, a venue or a party size, ignoring case and accents", () => {
    expect(named.filter((t) => matchesSearch(t, "tunde")).map((t) => t.id)).toEqual(["a"]);
    expect(named.filter((t) => matchesSearch(t, "PEANUTS")).map((t) => t.id)).toEqual(["a"]);
    expect(named.filter((t) => matchesSearch(t, "kulture")).map((t) => t.id)).toEqual(["c"]);
    expect(named.filter((t) => matchesSearch(t, "4")).map((t) => t.id)).toEqual(["b"]);
    expect(named.filter((t) => matchesSearch(t, "chidi")).map((t) => t.id)).toEqual(["d"]);
  });

  it("matches everything on an empty search", () => {
    expect(named.every((t) => matchesSearch(t, "  "))).toBe(true);
  });

  it("filters every list but leaves today's figures describing the day", () => {
    const desk = buildDesk(board(DAY.map((t) => (t.id === "req-friday" ? { ...t, guestName: "Kemi Adeyemi" } : t))), NOW);
    const found = filterDesk(desk, "kemi");
    expect(found.count).toBe(1);
    expect(found.todayTables).toEqual([]);
    expect(found.upcoming.map((g) => g.day)).toEqual(["2026-10-16"]);
    expect(found.figures).toEqual(desk.figures);
    expect(filterDesk(desk, "")).toBe(desk);
  });
});
