import { describe, expect, it } from "vitest";
import type { InspectionState } from "@/lib/inspections/types";
import {
  VISIT_FILTERS,
  applyFilter,
  chipOf,
  filterCounts,
  filterOf,
  groupByDay,
  isDay,
  lagosDay,
  lagosTime,
  monthGrid,
  rangeOf,
  shiftMonth,
  statesFor,
  summarise,
  toneOf,
  visitAt,
  visitModeFrom,
  weekOf,
  weekStart,
} from "./model";

const ALL_STATES: InspectionState[] = ["REQUESTED", "CONFIRMED", "PROPOSED", "DECLINED", "COMPLETED", "WITHDRAWN", "NO_SHOW"];

describe("a visit's Lagos day", () => {
  it("is the Lagos date, an hour ahead of UTC, all year", () => {
    expect(lagosDay("2026-10-16T22:59:00Z")).toBe("2026-10-16");
    expect(lagosDay("2026-10-16T23:00:00Z")).toBe("2026-10-17");
    expect(lagosDay("2026-07-01T23:30:00Z")).toBe("2026-07-02");
    expect(lagosTime("2026-10-16T23:30:00Z")).toBe("00:30");
  });

  it("sits on the agreed time, or the asked time until one is agreed", () => {
    expect(visitAt({ slotAt: "2026-10-17T14:00:00Z", requestedAt: "2026-10-16T09:00:00Z" })).toBe("2026-10-17T14:00:00Z");
    expect(visitAt({ slotAt: null, requestedAt: "2026-10-16T09:00:00Z" })).toBe("2026-10-16T09:00:00Z");
  });

  it("groups by Lagos day, earliest first, with a stable tie order", () => {
    const rows = [
      { id: "b", at: "2026-10-17T10:00:00Z" },
      { id: "a", at: "2026-10-17T10:00:00Z" },
      { id: "late", at: "2026-10-16T23:30:00Z" },
      { id: "fri", at: "2026-10-16T08:00:00Z" },
    ];
    const days = groupByDay(rows);
    expect([...days.keys()].sort()).toEqual(["2026-10-16", "2026-10-17"]);
    /* 23:30 UTC on Friday is 00:30 on Saturday in Lagos. */
    expect(days.get("2026-10-17")!.map((r) => r.id)).toEqual(["late", "a", "b"]);
    expect(days.get("2026-10-16")!.map((r) => r.id)).toEqual(["fri"]);
  });
});

describe("weeks and months", () => {
  it("starts a week on Monday", () => {
    expect(weekStart("2026-10-13")).toBe("2026-10-12");
    expect(weekStart("2026-10-18")).toBe("2026-10-12");
    expect(weekOf("2026-10-13")).toEqual([
      "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
    ]);
  });

  it("draws a month as whole weeks and marks the days outside it", () => {
    const october = monthGrid("2026-10-13");
    expect(october.length).toBe(35);
    expect(october[0]).toEqual({ day: "2026-09-28", inMonth: false });
    expect(october[3]).toEqual({ day: "2026-10-01", inMonth: true });
    expect(october[34]).toEqual({ day: "2026-11-01", inMonth: false });
    expect(october.filter((cell) => cell.inMonth).length).toBe(31);
    /* February 2027 starts on a Monday and ends on a Sunday: four rows exactly. */
    expect(monthGrid("2027-02-10").length).toBe(28);
    /* August 2026 needs six. */
    expect(monthGrid("2026-08-01").length).toBe(42);
  });

  it("moves by month, clamped to the shorter month's end", () => {
    expect(shiftMonth("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftMonth("2026-12-15", 1)).toBe("2027-01-15");
    expect(shiftMonth("2026-01-15", -1)).toBe("2025-12-15");
  });

  it("knows the first and last day each view draws", () => {
    expect(rangeOf("week", "2026-10-13")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(rangeOf("month", "2026-10-13")).toEqual({ from: "2026-09-28", to: "2026-11-01" });
  });

  it("accepts only real dates", () => {
    expect(isDay("2026-10-13")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("13/10/2026")).toBe(false);
    expect(isDay(undefined)).toBe(false);
  });
});

describe("states, chips and filters", () => {
  it("draws every state with one of seven words", () => {
    expect(ALL_STATES.map(chipOf)).toEqual(["requested", "confirmed", "proposed", "declined", "done", "withdrawn", "missed"]);
  });

  it("offers the five filters the founder named, in order", () => {
    expect(VISIT_FILTERS).toEqual(["requested", "proposed", "confirmed", "done", "missed"]);
    expect(filterOf("COMPLETED")).toBe("done");
    expect(filterOf("NO_SHOW")).toBe("missed");
    expect(filterOf("DECLINED")).toBeNull();
    expect(filterOf("WITHDRAWN")).toBeNull();
    expect(statesFor("done")).toEqual(["COMPLETED"]);
    expect(statesFor("missed")).toEqual(["NO_SHOW"]);
  });

  it("tones a state by whose move it is and how it ended", () => {
    expect(toneOf("requested")).toBe("pending");
    expect(toneOf("proposed")).toBe("pending");
    expect(toneOf("confirmed")).toBe("info");
    expect(toneOf("done")).toBe("success");
    expect(toneOf("missed")).toBe("error");
    expect(toneOf("declined")).toBe("error");
    expect(toneOf("withdrawn")).toBe("quiet");
  });

  it("filters, and counts what each filter would keep", () => {
    const rows = ALL_STATES.map((state, i) => ({ id: String(i), state }));
    expect(applyFilter(rows, "all").length).toBe(7);
    expect(applyFilter(rows, "confirmed").map((r) => r.state)).toEqual(["CONFIRMED"]);
    expect(filterCounts(rows)).toEqual({ all: 7, requested: 1, proposed: 1, confirmed: 1, done: 1, missed: 1 });
  });

  it("reads the visit mode, in person unless the column says video", () => {
    expect(visitModeFrom("video")).toBe("video");
    expect(visitModeFrom("in_person")).toBe("in_person");
    expect(visitModeFrom(null)).toBe("in_person");
  });
});

describe("the three figures", () => {
  const today = "2026-10-13";
  const row = (at: string, state: InspectionState) => ({ at, state });

  it("counts live visits today and over the next seven days, and every request waiting", () => {
    const rows = [
      row("2026-10-13T09:00:00Z", "CONFIRMED"),
      row("2026-10-13T15:00:00Z", "DECLINED"),
      row("2026-10-12T23:30:00Z", "PROPOSED"),
      row("2026-10-14T09:00:00Z", "REQUESTED"),
      row("2026-10-20T09:00:00Z", "CONFIRMED"),
      row("2026-10-21T09:00:00Z", "CONFIRMED"),
      row("2026-09-01T09:00:00Z", "REQUESTED"),
      row("2026-10-15T09:00:00Z", "COMPLETED"),
    ];
    expect(summarise(rows, today)).toEqual({ today: 2, next7: 2, needsAnswer: 2 });
  });

  it("is all zeros with nothing to count", () => {
    expect(summarise([], today)).toEqual({ today: 0, next7: 0, needsAnswer: 0 });
  });
});
