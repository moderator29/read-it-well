/**
 * THE TABLE WINDOW PICKER'S ONE RULE (Session 3, Stage 5: "/restaurant/[id]
 * with per-head and the window picker").
 *
 * The table form used to offer the same fifteen clock times every day, so a
 * venue that seats from six to ten in the evening was offered noon, and one
 * shut on Mondays was offered all of Monday. When the venue has published its
 * service windows, the times on offer for a day are the half hours inside
 * that day's windows, last seating thirty minutes before close. With no
 * published windows nothing is known, so the familiar times stay and the
 * venue confirms, exactly as before. PURE, so the rule is asserted rather
 * than eyeballed (`table-windows.test.ts`). It presents; it decides nothing:
 * the reservation action and the venue remain the authority on a table.
 */

export type ServiceWindow = { weekday: number; opens: string; closes: string };

/** The times people actually book, used when a venue publishes no hours. */
export const DEFAULT_SLOTS = [
  "12:00", "12:30", "13:00", "13:30", "14:00",
  "17:00", "17:30", "18:00", "18:30", "19:00",
  "19:30", "20:00", "20:30", "21:00", "21:30",
] as const;

const STEP = 30;
/** The last seating, before a window closes. */
const LAST_SEATING = 30;

function minutes(clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(clock);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h <= 24 && m < 60 ? h * 60 + m : null;
}

function clock(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** The weekday (0 Sunday) of a Lagos calendar date, read at midday UTC. */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/**
 * The half-hour times a party can ask for on `iso`.
 *
 *   windows null or empty    DEFAULT_SLOTS (hours unknown; the venue confirms)
 *   windows, none that day   [] (the venue does not seat that day)
 *   windows that day         every half hour from opening to the last seating
 *
 * `notBefore` (HH:MM, Lagos) drops times already past on the current day.
 * A window that closes after midnight runs to midnight on its own day.
 */
export function slotsFor(
  iso: string,
  windows: readonly ServiceWindow[] | null | undefined,
  notBefore?: string,
): string[] {
  const floor = notBefore ? (minutes(notBefore) ?? 0) : 0;
  if (!windows || windows.length === 0) {
    return DEFAULT_SLOTS.filter((slot) => (minutes(slot) ?? 0) >= floor);
  }
  const day = weekdayOf(iso);
  const out = new Set<number>();
  for (const window of windows) {
    if (window.weekday !== day) continue;
    const open = minutes(window.opens);
    let close = minutes(window.closes);
    if (open === null || close === null) continue;
    if (close <= open) close = 24 * 60;
    const first = Math.ceil(open / STEP) * STEP;
    for (let at = first; at + LAST_SEATING <= close; at += STEP) {
      if (at >= floor) out.add(at);
    }
  }
  return [...out].sort((a, b) => a - b).map(clock);
}
