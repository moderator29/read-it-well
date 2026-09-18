import type { ServiceWindowRow } from "./types";

/**
 * Opening hours, answered on the Lagos clock.
 *
 * A restaurant's service windows are wall-clock times where the kitchen is,
 * and Nigeria does not observe daylight saving, so "is it open now" is the
 * Lagos weekday and the Lagos time of day against the windows for that
 * weekday. This module is pure: the clock is injected, so the answer can be
 * proved for any moment without waiting for a Friday evening.
 */

export type OpenState = {
  open_now: boolean;
  hours_label: string;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** The Lagos weekday (0 is Sunday, as Postgres extract(dow)) and "HH:MM:SS". */
export function lagosClock(now: Date = new Date()): { weekday: number; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Some engines render midnight as "24"; the windows never do.
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
    time: `${hour}:${get("minute")}:${get("second")}`,
  };
}

/** "18:00:00" to "18:00" for a label. */
function hhmm(time: string): string {
  return time.slice(0, 5);
}

/**
 * Whether the venue is seating people at this moment, and the sentence that
 * says so. "Open" means inside a window and not past its last seating: a
 * kitchen that has stopped taking people is closed to a diner even while the
 * doors are unlocked.
 */
export function openState(windows: ServiceWindowRow[], now: Date = new Date()): OpenState {
  const { weekday, time } = lagosClock(now);
  const today = windows
    .filter((w) => w.weekday === weekday)
    .sort((a, b) => (a.opens < b.opens ? -1 : a.opens > b.opens ? 1 : 0));

  if (today.length === 0) {
    return { open_now: false, hours_label: "Closed today" };
  }

  const current = today.find((w) => w.opens <= time && time <= w.last_seating);
  if (current) {
    return { open_now: true, hours_label: `Open until ${hhmm(current.closes)}` };
  }

  const next = today.find((w) => w.opens > time);
  if (next) {
    return { open_now: false, hours_label: `Opens at ${hhmm(next.opens)}` };
  }

  return { open_now: false, hours_label: "Closed for today" };
}
