import { describe, expect, it } from "vitest";

import { HOURS_UNKNOWN_LABEL, lagosClock, openState } from "./hours";
import type { ServiceWindowRow } from "./types";

/**
 * Open-now on the Lagos clock, proved for fixed instants.
 *
 * Lagos is UTC+01:00 all year, so 2026-09-18T18:30:00Z is Friday 19:30 in
 * Lagos, whatever the machine running this believes about its own zone.
 */
const window = (weekday: number, opens: string, last: string, closes: string): ServiceWindowRow => ({
  id: `${weekday}-${opens}`,
  business_id: "b",
  weekday,
  opens,
  last_seating: last,
  closes,
  covers: 40,
});

const FRIDAY_DINNER = window(5, "18:00:00", "21:30:00", "23:00:00");
const FRIDAY_LUNCH = window(5, "12:00:00", "14:30:00", "16:00:00");

describe("lagosClock", () => {
  it("reads the Lagos weekday and time from a UTC instant", () => {
    const clock = lagosClock(new Date("2026-09-18T18:30:00Z"));
    expect(clock).toEqual({ weekday: 5, time: "19:30:00" });
  });

  it("rolls the weekday over at Lagos midnight, not UTC midnight", () => {
    // 23:30Z on Friday is 00:30 Saturday in Lagos.
    expect(lagosClock(new Date("2026-09-18T23:30:00Z")).weekday).toBe(6);
    expect(lagosClock(new Date("2026-09-18T23:30:00Z")).time).toBe("00:30:00");
  });
});

describe("openState", () => {
  it("is open inside a window before last seating", () => {
    const state = openState([FRIDAY_LUNCH, FRIDAY_DINNER], new Date("2026-09-18T18:30:00Z"));
    expect(state).toEqual({ open_now: true, hours_label: "Open until 23:00" });
  });

  it("is closed after last seating even though the doors are open", () => {
    // 21:45 Lagos: inside dinner, past last seating.
    const state = openState([FRIDAY_DINNER], new Date("2026-09-18T20:45:00Z"));
    expect(state.open_now).toBe(false);
    expect(state.hours_label).toBe("Closed for today");
  });

  it("names the next window between services", () => {
    // 16:30 Lagos: lunch over, dinner ahead.
    const state = openState([FRIDAY_LUNCH, FRIDAY_DINNER], new Date("2026-09-18T15:30:00Z"));
    expect(state).toEqual({ open_now: false, hours_label: "Opens at 18:00" });
  });

  it("is closed today when no window exists for the weekday", () => {
    // Saturday in Lagos, only Friday windows.
    const state = openState([FRIDAY_DINNER], new Date("2026-09-19T12:00:00Z"));
    expect(state).toEqual({ open_now: false, hours_label: "Closed today" });
  });

  it("does not let a Saturday window answer for a Friday", () => {
    const state = openState([window(6, "18:00:00", "21:30:00", "23:00:00")], new Date("2026-09-18T18:30:00Z"));
    expect(state.open_now).toBe(false);
  });

  /*
   * NO WINDOWS AT ALL IS NOT "CLOSED TODAY", and this is the distinction the
   * label used to lose. "Closed today" says a timetable exists and this day is
   * not on it. A venue that has published nothing supports no such claim.
   */
  it("says the hours are not published when there are no windows at all", () => {
    const state = openState([], new Date("2026-09-18T18:30:00Z"));
    expect(state).toEqual({ open_now: false, hours_label: HOURS_UNKNOWN_LABEL });
    expect(state.hours_label).not.toBe("Closed today");
  });

  it("still says closed today when a timetable exists and this weekday is not on it", () => {
    // Sunday in Lagos, only Friday windows: a real claim, and it stays.
    const state = openState([FRIDAY_DINNER], new Date("2026-09-20T12:00:00Z"));
    expect(state).toEqual({ open_now: false, hours_label: "Closed today" });
  });
});

/*
 * ACROSS MIDNIGHT, BOTH WAYS A VENUE CAN BE MODELLED.
 *
 * M7's `service_windows_order_chk` says `opens < closes`, so a live row cannot
 * run past midnight and a venue serving until 2am is TWO rows: Friday evening
 * and a Saturday small-hours row. Both spellings are proved here, because the
 * constraint is schema and this module must not quietly depend on it.
 */
describe("openState across midnight", () => {
  const FRIDAY_LATE = window(5, "18:00:00", "23:00:00", "23:59:59");
  const SATURDAY_SMALL_HOURS = window(6, "00:00:00", "01:30:00", "02:00:00");

  it("is open at 00:30 on the two-row spelling the schema allows", () => {
    // 23:30Z Friday is 00:30 Saturday in Lagos.
    const state = openState(
      [FRIDAY_LATE, SATURDAY_SMALL_HOURS],
      new Date("2026-09-18T23:30:00Z"),
    );
    expect(state).toEqual({ open_now: true, hours_label: "Open until 02:00" });
  });

  it("is closed at 03:00, once the small-hours window has ended", () => {
    const state = openState(
      [FRIDAY_LATE, SATURDAY_SMALL_HOURS],
      new Date("2026-09-19T02:00:00Z"),
    );
    expect(state.open_now).toBe(false);
    expect(state.hours_label).toBe("Closed for today");
  });

  /* The single-row spelling: one Friday window that runs to 02:00. The check
     constraint refuses it today; the row TYPE does not, and answering "closed"
     to somebody sitting in the dining room would be the worst kind of wrong. */
  const FRIDAY_OVERNIGHT = window(5, "18:00:00", "01:00:00", "02:00:00");

  it("is open at 22:00 on the Friday evening half of an overnight window", () => {
    const state = openState([FRIDAY_OVERNIGHT], new Date("2026-09-18T21:00:00Z"));
    expect(state).toEqual({ open_now: true, hours_label: "Open until 02:00" });
  });

  it("is open at 00:30 on the Saturday morning half of a Friday overnight window", () => {
    const state = openState([FRIDAY_OVERNIGHT], new Date("2026-09-18T23:30:00Z"));
    expect(state).toEqual({ open_now: true, hours_label: "Open until 02:00" });
  });

  it("is closed at 01:30, past the overnight window's last seating", () => {
    // 00:30Z Saturday is 01:30 Lagos: inside the window, past last seating.
    const state = openState([FRIDAY_OVERNIGHT], new Date("2026-09-19T00:30:00Z"));
    expect(state.open_now).toBe(false);
    expect(state.hours_label).toBe("Closed today");
  });

  it("does not let a plain evening window spill into the next morning", () => {
    // Friday 18:00 to 23:00 says nothing about Saturday at 00:30.
    const state = openState([FRIDAY_DINNER], new Date("2026-09-18T23:30:00Z"));
    expect(state).toEqual({ open_now: false, hours_label: "Closed today" });
  });
});

describe("isOpenNow and hoursForWeekday", () => {
  it("answers yes inside a window and no once last seating has passed", async () => {
    const { isOpenNow, hoursForWeekday } = await import("./hours");
    expect(isOpenNow([FRIDAY_LUNCH, FRIDAY_DINNER], new Date("2026-09-18T18:30:00Z"))).toBe(true);
    expect(isOpenNow([FRIDAY_DINNER], new Date("2026-09-18T20:45:00Z"))).toBe(false);
    expect(hoursForWeekday([FRIDAY_LUNCH, FRIDAY_DINNER], 5)).toBe("12:00 to 16:00, 18:00 to 23:00");
    expect(hoursForWeekday([FRIDAY_DINNER], 6)).toBe("Closed");
  });

  it("reads no windows for an id that is not a uuid, without touching a client", async () => {
    const { readServiceWindows } = await import("./hours");
    await expect(readServiceWindows("not-an-id")).resolves.toEqual([]);
  });
});
