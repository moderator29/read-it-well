import { describe, expect, it } from "vitest";
import {
  buildFrontDesk,
  callRecordStayEvent,
  refusalFor,
  type StayEvents,
  type StayEventClient,
  type StayRow,
} from "./front-desk";

const TODAY = "2026-10-13";

function row(over: Partial<StayRow> & { id: string; checkIn: string; checkOut: string }): StayRow {
  return {
    status: "CONFIRMED",
    rooms: 1,
    guestName: over.id,
    hotel: "Harbour Hotel",
    room: "Deluxe",
    paid: true,
    ...over,
  };
}

const marks = (entries: Record<string, { in?: string; out?: string }>): StayEvents =>
  new Map(Object.entries(entries).map(([id, m]) => [id, { checkedInAt: m.in ?? null, checkedOutAt: m.out ?? null }]));

describe("the front desk lists", () => {
  const stays = [
    row({ id: "arrives", checkIn: TODAY, checkOut: "2026-10-16" }),
    row({ id: "arrived", checkIn: TODAY, checkOut: "2026-10-15" }),
    row({ id: "staying", checkIn: "2026-10-11", checkOut: "2026-10-15" }),
    row({ id: "leaves", checkIn: "2026-10-10", checkOut: TODAY }),
    row({ id: "gone", checkIn: "2026-10-10", checkOut: TODAY }),
    row({ id: "later", checkIn: "2026-10-14", checkOut: "2026-10-16" }),
    row({ id: "waiting", checkIn: TODAY, checkOut: "2026-10-15", status: "PENDING" }),
    row({ id: "noshow", checkIn: TODAY, checkOut: "2026-10-15", status: "NO_SHOW" }),
    row({ id: "cancelled", checkIn: TODAY, checkOut: "2026-10-15", status: "CANCELLED" }),
  ];
  const events = marks({
    arrived: { in: "2026-10-13T09:00:00Z" },
    staying: { in: "2026-10-11T14:00:00Z" },
    leaves: { in: "2026-10-10T13:00:00Z" },
    gone: { in: "2026-10-10T13:00:00Z", out: "2026-10-13T08:00:00Z" },
  });
  const desk = buildFrontDesk({ today: TODAY, stays, events });

  it("lists who still has to be checked in, who is in the house and who is leaving", () => {
    expect(desk.arriving.map((s) => s.id)).toEqual(["arrives"]);
    expect(desk.inHouse.map((s) => s.id)).toEqual(["arrived", "staying"]);
    expect(desk.leaving.map((s) => s.id)).toEqual(["leaves"]);
  });

  it("leaves out a request still waiting, a no-show, a cancelled stay and a guest already out", () => {
    const listed = [...desk.arriving, ...desk.inHouse, ...desk.leaving].map((s) => s.id);
    for (const id of ["waiting", "noshow", "cancelled", "gone", "later"]) expect(listed).not.toContain(id);
  });

  it("counts arrivals and departures whether or not they are marked, and says how many are still to do", () => {
    expect(desk.figures).toEqual({
      arrivalsToday: 2,
      arrivalsToCheckIn: 1,
      inHouse: 3,
      departuresToday: 2,
      departuresToCheckOut: 1,
    });
  });

  it("keeps a list free of overlap: a stay is in one list only", () => {
    const ids = [...desk.arriving, ...desk.inHouse, ...desk.leaving].map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries the time of the mark on the guest", () => {
    expect(desk.inHouse.find((s) => s.id === "arrived")!.checkedInAt).toBe("2026-10-13T09:00:00Z");
  });
});

describe("late arrivals and late check-outs", () => {
  it("lists a guest whose arrival day passed unmarked as a late arrival until the day they would leave", () => {
    const desk = buildFrontDesk({
      today: TODAY,
      stays: [
        row({ id: "late", checkIn: "2026-10-12", checkOut: "2026-10-15" }),
        row({ id: "tooLate", checkIn: "2026-10-11", checkOut: TODAY }),
      ],
      events: marks({}),
    });
    expect(desk.arriving.map((s) => [s.id, s.late])).toEqual([["late", true]]);
  });

  it("keeps a guest who is still in after their departure day on the leaving list, flagged late", () => {
    const desk = buildFrontDesk({
      today: TODAY,
      stays: [row({ id: "over", checkIn: "2026-10-09", checkOut: "2026-10-12" })],
      events: marks({ over: { in: "2026-10-09T12:00:00Z" } }),
    });
    expect(desk.leaving.map((s) => [s.id, s.late])).toEqual([["over", true]]);
  });

  it("does not flag today's departure as late", () => {
    const desk = buildFrontDesk({
      today: TODAY,
      stays: [row({ id: "ok", checkIn: "2026-10-10", checkOut: TODAY })],
      events: marks({ ok: { in: "2026-10-10T12:00:00Z" } }),
    });
    expect(desk.leaving[0]!.late).toBe(false);
  });
});

describe("a stay across Lagos midnight", () => {
  it("moves from arriving to in house to leaving as the Lagos day turns, never listing it twice", () => {
    const stays = [row({ id: "s", checkIn: "2026-10-13", checkOut: "2026-10-15" })];
    const day = (today: string, e: StayEvents) => buildFrontDesk({ today, stays, events: e });
    expect(day("2026-10-13", marks({})).arriving).toHaveLength(1);
    const checkedIn = marks({ s: { in: "2026-10-13T13:00:00Z" } });
    expect(day("2026-10-13", checkedIn).inHouse).toHaveLength(1);
    expect(day("2026-10-14", checkedIn).inHouse).toHaveLength(1);
    expect(day("2026-10-15", checkedIn).leaving).toHaveLength(1);
    expect(day("2026-10-15", checkedIn).inHouse).toHaveLength(0);
  });
});

describe("when the marks cannot be read", () => {
  const desk = buildFrontDesk({
    today: TODAY,
    stays: [
      row({ id: "a", checkIn: TODAY, checkOut: "2026-10-15" }),
      row({ id: "b", checkIn: "2026-10-11", checkOut: "2026-10-15" }),
      row({ id: "c", checkIn: "2026-10-10", checkOut: TODAY }),
    ],
    events: null,
  });

  it("cuts the lists from the dates alone and says the marks are unknown", () => {
    expect(desk.marksKnown).toBe(false);
    expect(desk.arriving.map((s) => s.id)).toEqual(["a"]);
    expect(desk.inHouse.map((s) => s.id)).toEqual(["b"]);
    expect(desk.leaving.map((s) => s.id)).toEqual(["c"]);
  });

  it("counts only those staying tonight as in house, not a guest who leaves today", () => {
    expect(desk.figures.inHouse).toBe(1);
    expect(desk.figures.arrivalsToday).toBe(1);
    expect(desk.figures.departuresToday).toBe(1);
  });
});

describe("the RPC wrapper", () => {
  const client = (reply: { data?: unknown; error?: { code?: string; message?: string } | null }) => {
    const calls: [string, Record<string, unknown>][] = [];
    const db: StayEventClient = {
      rpc: async (fn, args) => {
        calls.push([fn, args]);
        return { data: reply.data ?? null, error: reply.error ?? null };
      },
    };
    return { db, calls };
  };

  it("calls record_stay_event with the booking and the kind and returns the instant", async () => {
    const { db, calls } = client({ data: "2026-10-13T09:00:00+00:00" });
    expect(await callRecordStayEvent(db, "b1", "checked_in")).toEqual({ ok: true, at: "2026-10-13T09:00:00+00:00" });
    expect(calls).toEqual([["record_stay_event", { p_booking: "b1", p_kind: "checked_in" }]]);
  });

  it("treats a second tap, which returns the first time, as a success", async () => {
    const { db } = client({ data: "2026-10-13T09:00:00+00:00" });
    const first = await callRecordStayEvent(db, "b1", "checked_out");
    const second = await callRecordStayEvent(db, "b1", "checked_out");
    expect(second).toEqual(first);
  });

  it("says not available, never success, before the migration is applied", async () => {
    for (const code of ["42883", "PGRST202"]) {
      const { db } = client({ error: { code, message: "Could not find the function public.record_stay_event" } });
      expect(await callRecordStayEvent(db, "b1", "checked_in")).toEqual({ ok: false, reason: "not_available" });
    }
  });

  it("does not report success when the answer is not an instant", async () => {
    expect(await callRecordStayEvent(client({ data: null }).db, "b1", "checked_in")).toEqual({ ok: false, reason: "failed" });
    expect(await callRecordStayEvent(client({ data: "soon" }).db, "b1", "checked_in")).toEqual({ ok: false, reason: "failed" });
  });

  it("maps the database's own refusals to a reason", () => {
    expect(refusalFor({ code: "42501", message: "not your booking" })).toBe("not_yours");
    expect(refusalFor({ code: "42501", message: "sign in" })).toBe("sign_in");
    expect(refusalFor({ code: "22023", message: "check the guest in first" })).toBe("check_in_first");
    expect(refusalFor({ code: "22023", message: "only a confirmed stay can be checked in or out" })).toBe("not_confirmed");
    expect(
      refusalFor({ code: "22023", message: "a guest is checked in from the arrival day to the departure day" }),
    ).toBe("outside_dates");
    expect(refusalFor({ code: "XX000", message: "boom" })).toBe("failed");
  });
});
