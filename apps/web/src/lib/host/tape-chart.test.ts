import { describe, expect, it } from "vitest";
import {
  addDays,
  barFor,
  buildTapeChart,
  daysBetween,
  filterGroups,
  lagosDayOf,
  packLanes,
  tapeDays,
  type TapeInventory,
  type TapeRoomType,
  type TapeStay,
} from "./tape-chart";

const TODAY = "2026-10-13";
const DELUXE: TapeRoomType = { id: "rt-deluxe", name: "Deluxe", hotel: "Harbour Hotel", unitsTotal: 4 };
const STANDARD: TapeRoomType = { id: "rt-standard", name: "Standard", hotel: "Harbour Hotel", unitsTotal: 10 };

function stay(over: Partial<TapeStay> & { id: string; checkIn: string; checkOut: string }): TapeStay {
  return { roomTypeId: DELUXE.id, status: "CONFIRMED", rooms: 1, guestName: "Ada", paid: true, ...over };
}

function inventory(roomTypeId: string, from: string, rows: [open: number, booked: number][]): TapeInventory[] {
  return rows.map(([unitsOpen, unitsBooked], i) => ({ roomTypeId, date: addDays(from, i), unitsOpen, unitsBooked }));
}

describe("Lagos days", () => {
  it("opens on tomorrow's date after 23:00 UTC, because Lagos is an hour ahead", () => {
    expect(lagosDayOf(new Date("2026-10-13T22:59:00Z"))).toBe("2026-10-13");
    expect(lagosDayOf(new Date("2026-10-13T23:30:00Z"))).toBe("2026-10-14");
  });

  it("adds days across a month end and counts the days between two dates", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-10-13", "2026-10-20")).toBe(7);
    expect(daysBetween("2026-10-20", "2026-10-13")).toBe(-7);
  });

  it("lays out fourteen days from today with the weekend marked", () => {
    const days = tapeDays(TODAY);
    expect(days).toHaveLength(14);
    expect(days[0]).toMatchObject({ date: "2026-10-13", today: true, weekday: 2, weekend: false });
    /* 17 and 18 October 2026 are a Saturday and a Sunday. */
    expect(days.filter((d) => d.weekend).map((d) => d.date)).toEqual(["2026-10-17", "2026-10-18", "2026-10-24", "2026-10-25"]);
    expect(days[13]!.date).toBe("2026-10-26");
  });
});

describe("a stay as a bar", () => {
  it("runs from the second half of the arrival day to the first half of the departure day", () => {
    /* Arrives day 2 (15 Oct), leaves day 5 (18 Oct): three nights. */
    const bar = barFor(stay({ id: "a", checkIn: "2026-10-15", checkOut: "2026-10-18" }), TODAY)!;
    expect(bar).toMatchObject({ startLine: 6, endLine: 12, nights: 3, clippedStart: false, clippedEnd: false });
  });

  it("puts one guest leaving and another arriving on the same day end to end", () => {
    const out = barFor(stay({ id: "out", checkIn: "2026-10-14", checkOut: "2026-10-17" }), TODAY)!;
    const next = barFor(stay({ id: "in", checkIn: "2026-10-17", checkOut: "2026-10-19" }), TODAY)!;
    expect(out.endLine).toBe(next.startLine);
    expect(packLanes([out, next])).toHaveLength(1);
  });

  it("clips a stay that began before the window and keeps its whole length", () => {
    const bar = barFor(stay({ id: "a", checkIn: "2026-10-10", checkOut: "2026-10-15" }), TODAY)!;
    expect(bar).toMatchObject({ startLine: 1, clippedStart: true, clippedEnd: false, nights: 5, inHouse: true });
    expect(bar.endLine).toBe(6);
  });

  it("clips a stay that runs past the last day", () => {
    const bar = barFor(stay({ id: "a", checkIn: "2026-10-24", checkOut: "2026-11-02" }), TODAY)!;
    expect(bar).toMatchObject({ clippedStart: false, clippedEnd: true, endLine: 29, nights: 9 });
    expect(bar.startLine).toBe(24);
  });

  it("keeps a guest who leaves today on the chart, for the morning only", () => {
    const bar = barFor(stay({ id: "a", checkIn: "2026-10-11", checkOut: TODAY }), TODAY)!;
    expect(bar).toMatchObject({ startLine: 1, endLine: 2, dueOut: true, inHouse: false, clippedStart: true });
  });

  it("keeps a guest who arrives on the last day, for the afternoon only", () => {
    const bar = barFor(stay({ id: "a", checkIn: "2026-10-26", checkOut: "2026-10-28" }), TODAY)!;
    expect(bar).toMatchObject({ startLine: 28, endLine: 29, clippedEnd: true });
  });

  it("leaves out what is wholly before or after the window, and what holds no room", () => {
    expect(barFor(stay({ id: "a", checkIn: "2026-10-08", checkOut: "2026-10-12" }), TODAY)).toBeNull();
    expect(barFor(stay({ id: "a", checkIn: "2026-10-27", checkOut: "2026-10-29" }), TODAY)).toBeNull();
    expect(barFor(stay({ id: "a", checkIn: "2026-10-15", checkOut: "2026-10-17", status: "CANCELLED" }), TODAY)).toBeNull();
    expect(barFor(stay({ id: "a", checkIn: "2026-10-15", checkOut: "2026-10-17", status: "NO_SHOW" }), TODAY)).toBeNull();
    expect(barFor(stay({ id: "a", checkIn: "2026-10-17", checkOut: "2026-10-17" }), TODAY)).toBeNull();
  });

  it("draws a request waiting for an answer, because it holds its rooms", () => {
    expect(barFor(stay({ id: "a", checkIn: "2026-10-15", checkOut: "2026-10-17", status: "PENDING" }), TODAY)?.status).toBe("PENDING");
  });

  it("opens on the Lagos date when the page renders after 23:00 UTC", () => {
    const today = lagosDayOf(new Date("2026-10-13T23:30:00Z"));
    expect(today).toBe("2026-10-14");
    /* A stay that left on the 13th is gone; one leaving on the 14th is the
       morning's; one arriving on the 14th starts on day zero. */
    expect(barFor(stay({ id: "gone", checkIn: "2026-10-12", checkOut: "2026-10-13" }), today)).toBeNull();
    expect(barFor(stay({ id: "morning", checkIn: "2026-10-12", checkOut: "2026-10-14" }), today)).toMatchObject({ dueOut: true });
    expect(barFor(stay({ id: "arrive", checkIn: "2026-10-14", checkOut: "2026-10-16" }), today)).toMatchObject({
      arriving: true,
      startLine: 2,
    });
  });
});

describe("lanes", () => {
  it("packs overlapping bars into rows and reuses a row once it is free", () => {
    const bars = [
      barFor(stay({ id: "a", checkIn: "2026-10-13", checkOut: "2026-10-16" }), TODAY)!,
      barFor(stay({ id: "b", checkIn: "2026-10-14", checkOut: "2026-10-18" }), TODAY)!,
      barFor(stay({ id: "c", checkIn: "2026-10-16", checkOut: "2026-10-19" }), TODAY)!,
    ];
    const lanes = packLanes(bars);
    expect(lanes.map((lane) => lane.map((b) => b.id))).toEqual([["a", "c"], ["b"]]);
  });
});

describe("the chart", () => {
  const stays = [
    stay({ id: "one", checkIn: "2026-10-12", checkOut: "2026-10-15", guestName: "Bola" }),
    stay({ id: "two", checkIn: "2026-10-11", checkOut: TODAY, guestName: "Chidi", rooms: 2 }),
    stay({ id: "three", roomTypeId: STANDARD.id, checkIn: "2026-10-18", checkOut: "2026-10-20", guestName: "Dayo" }),
  ];
  const rows = [
    ...inventory(DELUXE.id, TODAY, [[4, 3], [4, 1], [4, 1], ...Array.from({ length: 11 }, () => [4, 0] as [number, number])]),
    ...inventory(STANDARD.id, TODAY, Array.from({ length: 14 }, (_, i): [number, number] => [8, i === 5 || i === 6 ? 1 : 0])),
  ];
  const chart = buildTapeChart({ today: TODAY, roomTypes: [DELUXE, STANDARD], inventory: rows, stays });

  it("counts available and occupancy per day from the inventory", () => {
    const deluxe = chart.groups[0]!;
    expect(deluxe.cells[0]).toMatchObject({ open: 4, booked: 3, available: 1, blocked: 0, occupancyPct: 75 });
    expect(deluxe.cells[1]).toMatchObject({ available: 3, occupancyPct: 25 });
    expect(deluxe.cells[5]).toMatchObject({ available: 4, occupancyPct: 0 });
  });

  it("reports rooms taken off sale as blocked, and counts occupancy against all the rooms", () => {
    const standard = chart.groups[1]!;
    expect(standard.cells[0]).toMatchObject({ open: 8, booked: 0, available: 8, blocked: 2, occupancyPct: 0 });
    expect(standard.cells[5]).toMatchObject({ booked: 1, occupancyPct: 10 });
  });

  it("totals every room type, and tonight's occupancy across all the rooms", () => {
    expect(chart.totals[0]).toMatchObject({ booked: 3, available: 9, occupancyPct: 21 });
    expect(chart.tonight).toEqual({ booked: 3, total: 14, pct: 21 });
  });

  it("marks a night with no inventory row as not on sale, not as empty", () => {
    const sparse = buildTapeChart({ today: TODAY, roomTypes: [DELUXE], inventory: inventory(DELUXE.id, TODAY, [[4, 1]]), stays: [] });
    expect(sparse.groups[0]!.cells[1]).toEqual({
      date: "2026-10-14",
      open: null,
      booked: null,
      available: null,
      blocked: null,
      occupancyPct: null,
    });
    expect(sparse.totals[1]!.occupancyPct).toBeNull();
    expect(sparse.tonight).toEqual({ booked: 1, total: 4, pct: 25 });
  });

  it("has no occupancy to state for a hotel with no inventory at all", () => {
    const empty = buildTapeChart({ today: TODAY, roomTypes: [DELUXE], inventory: [], stays: [] });
    expect(empty.tonight).toEqual({ booked: 0, total: 0, pct: null });
  });

  it("puts each stay on its own room type, in rows that do not overlap", () => {
    const deluxe = chart.groups[0]!;
    expect(deluxe.lanes.map((lane) => lane.map((b) => b.id))).toEqual([["two"], ["one"]]);
    expect(chart.groups[1]!.lanes[0]![0]).toMatchObject({ id: "three", guestName: "Dayo" });
  });

  it("filters room types by tonight: vacant, occupied, due out", () => {
    expect(filterGroups(chart.groups, "all")).toHaveLength(2);
    expect(filterGroups(chart.groups, "vacant").map((g) => g.roomType.id)).toEqual([DELUXE.id, STANDARD.id]);
    expect(filterGroups(chart.groups, "occupied").map((g) => g.roomType.id)).toEqual([DELUXE.id]);
    expect(filterGroups(chart.groups, "dueOut").map((g) => g.roomType.id)).toEqual([DELUXE.id]);
    expect(chart.counts).toEqual({ all: 2, vacant: 2, occupied: 1, dueOut: 1 });
  });

  it("is not vacant when every room is held", () => {
    const full = buildTapeChart({ today: TODAY, roomTypes: [DELUXE], inventory: inventory(DELUXE.id, TODAY, [[4, 4]]), stays: [] });
    expect(full.groups[0]!.vacant).toBe(false);
    expect(full.groups[0]!.occupied).toBe(true);
  });
});
