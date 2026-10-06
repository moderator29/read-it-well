import { describe, expect, it } from "vitest";
import { DEFAULT_SLOTS, slotsFor, weekdayOf } from "./table-windows";

/* 2026-10-05 is a Monday, 2026-10-06 a Tuesday. */
const MONDAY = "2026-10-05";
const TUESDAY = "2026-10-06";

describe("slotsFor, the table window picker", () => {
  it("keeps the familiar times when the venue publishes no hours", () => {
    expect(slotsFor(MONDAY, null)).toEqual([...DEFAULT_SLOTS]);
    expect(slotsFor(MONDAY, [])).toEqual([...DEFAULT_SLOTS]);
  });

  it("offers nothing on a day the venue does not seat", () => {
    expect(weekdayOf(MONDAY)).toBe(1);
    expect(slotsFor(MONDAY, [{ weekday: 2, opens: "18:00", closes: "22:00" }])).toEqual([]);
  });

  it("offers each half hour inside the window, last seating thirty minutes before close", () => {
    expect(slotsFor(TUESDAY, [{ weekday: 2, opens: "18:00:00", closes: "20:00:00" }])).toEqual([
      "18:00",
      "18:30",
      "19:00",
      "19:30",
    ]);
  });

  it("joins two windows in one day and starts on the next half hour", () => {
    expect(
      slotsFor(TUESDAY, [
        { weekday: 2, opens: "12:10", closes: "13:30" },
        { weekday: 2, opens: "19:00", closes: "20:00" },
      ]),
    ).toEqual(["12:30", "13:00", "19:00", "19:30"]);
  });

  it("runs a window that closes after midnight to midnight", () => {
    expect(slotsFor(TUESDAY, [{ weekday: 2, opens: "22:30", closes: "01:00" }])).toEqual(["22:30", "23:00", "23:30"]);
  });

  it("drops the times already past today", () => {
    expect(slotsFor(TUESDAY, [{ weekday: 2, opens: "18:00", closes: "20:00" }], "18:45")).toEqual(["19:00", "19:30"]);
    expect(slotsFor(TUESDAY, null, "21:10")).toEqual(["21:30"]);
  });
});
