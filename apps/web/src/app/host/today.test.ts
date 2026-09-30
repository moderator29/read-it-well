import { describe, expect, it } from "vitest";
import { hostToday, lagosDay, type TodayRoomBooking } from "./today";

/* 29 September 2026, 23:30 UTC is already 30 September in Lagos (UTC+1). */
const LATE = new Date("2026-09-29T23:30:00Z");
const NOON = new Date("2026-09-29T11:00:00Z");

function room(over: Partial<TodayRoomBooking>): TodayRoomBooking {
  return {
    id: "b1",
    status: "CONFIRMED",
    checkIn: "2026-09-29",
    checkOut: "2026-10-01",
    guestName: "Seyi",
    hotel: "Grand Vista",
    room: "Deluxe",
    createdAt: "2026-09-20T10:00:00Z",
    ...over,
  };
}

describe("hostToday", () => {
  it("reads the Lagos calendar day, not the server's", () => {
    expect(lagosDay(LATE)).toBe("2026-09-30");
    expect(lagosDay(NOON)).toBe("2026-09-29");
  });

  it("counts arrivals, stays and waiting requests from the rows alone", () => {
    const out = hostToday({
      now: NOON,
      rooms: {
        waiting: [room({ id: "w1", status: "PENDING", checkIn: "2026-10-04" })],
        upcoming: [
          room({ id: "a1", checkIn: "2026-09-29" }),
          room({ id: "s1", checkIn: "2026-09-27", checkOut: "2026-09-30" }),
          room({ id: "f1", checkIn: "2026-10-10", checkOut: "2026-10-12" }),
        ],
        past: [room({ id: "p1", status: "COMPLETED", checkIn: "2026-09-01", checkOut: "2026-09-03" })],
      },
      tables: null,
      unread: 3,
      businesses: [],
      draft: null,
    });
    const kpi = Object.fromEntries(out.kpis.map((k) => [k.key, k.value]));
    expect(kpi).toEqual({ arriving: 1, staying: 2, requests: 1, unread: 3 });
    expect(out.stages.map((s) => [s.key, s.count])).toEqual([
      ["requested", 1],
      ["confirmed", 1],
      ["staying", 2],
      ["completed", 1],
    ]);
    expect(out.attention).toHaveLength(1);
    expect(out.attention[0]?.kind).toBe("request");
  });

  it("leaves out what could not be read instead of printing zero", () => {
    const out = hostToday({ now: NOON, rooms: null, tables: null, unread: null, businesses: [], draft: null });
    expect(out.kpis).toEqual([]);
    expect(out.stages).toEqual([]);
    expect(out.needsYou).toBe(0);
  });

  it("draws no gauge when there is not one reservation", () => {
    const out = hostToday({
      now: NOON,
      rooms: { waiting: [], upcoming: [], past: [] },
      tables: { requests: [], upcoming: [], past: [] },
      unread: 0,
      businesses: [],
      draft: null,
    });
    expect(out.stages).toEqual([]);
    /* Zero is a fact: the tiles still show. */
    expect(out.kpis.map((k) => k.value)).toEqual([0, 0, 0, 0]);
  });

  it("puts a stopped business and an unsent application on the attention list", () => {
    const out = hostToday({
      now: NOON,
      rooms: null,
      tables: null,
      unread: 0,
      businesses: [
        { id: "x", name: "Harbour Kitchen", status: "MORE_INFO_REQUIRED" },
        { id: "y", name: "Grand Vista", status: "PUBLISHED" },
      ],
      draft: { name: "Ikoyi Guest House", missing: 17, submitted: false },
    });
    expect(out.attention.map((a) => a.kind)).toEqual(["stopped", "draft"]);
  });
});
