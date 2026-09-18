import { describe, expect, it } from "vitest";

import { lagosClock, openState } from "./hours";
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
});
