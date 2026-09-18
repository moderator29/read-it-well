import type { ServiceWindowRow } from "./types";

/**
 * Opening hours, answered on the Lagos clock.
 *
 * A restaurant's service windows are wall-clock times where the kitchen is,
 * and Nigeria does not observe daylight saving, so "is it open now" is the
 * Lagos weekday and the Lagos time of day against the windows for that
 * weekday. The arithmetic here is pure: the clock is injected, so the answer
 * can be proved for any moment without waiting for a Friday evening. The one
 * read, `readServiceWindows`, loads its client lazily so this module stays
 * importable by a test with no database behind it.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** The yes-or-no form of `openState`, for a filter or a chip. */
export function isOpenNow(windows: ServiceWindowRow[], at: Date = new Date()): boolean {
  return openState(windows, at).open_now;
}

/** One weekday's hours in words: "12:00 to 16:00, 18:00 to 23:00", or "Closed". */
export function hoursForWeekday(windows: ServiceWindowRow[], weekday: number): string {
  const day = windows
    .filter((w) => w.weekday === weekday)
    .sort((a, b) => (a.opens < b.opens ? -1 : a.opens > b.opens ? 1 : 0));
  if (day.length === 0) return "Closed";
  return day.map((w) => `${hhmm(w.opens)} to ${hhmm(w.closes)}`).join(", ");
}

/**
 * A restaurant's service windows, by the id its page carries.
 *
 * Hours hang off `businesses` (M7), so a business id answers with its windows
 * and anything else answers with none. A restaurant that is still a catalogue
 * LISTING (the 64 example rows carry two) has no hours anywhere, and an empty
 * list is the honest answer: the page then refuses to guess open-now rather
 * than inventing a timetable. Read through the caller's own RLS-bound client;
 * the policy shows a signed-out diner the windows of a PUBLISHED business.
 *
 * The client is imported at call time so this pure module carries no
 * server-only import at load, which is what keeps `openState` testable.
 */
export async function readServiceWindows(listingOrBusinessId: string): Promise<ServiceWindowRow[]> {
  if (!UUID_RE.test(listingOrBusinessId)) return [];
  try {
    const { isSupabaseConfigured } = await import("../supabase/env");
    if (!isSupabaseConfigured()) return [];
    const { staysClient } = await import("./db");
    const supabase = await staysClient();
    const { data, error } = await supabase
      .from("service_windows")
      .select("*")
      .eq("business_id", listingOrBusinessId)
      .order("weekday")
      .order("opens");
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
