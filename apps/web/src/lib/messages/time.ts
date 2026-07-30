/**
 * Lagos wall-clock labels for messaging surfaces. Client-safe module.
 *
 * Database timestamps are UTC instants; every label is formatted in
 * Africa/Lagos with fixed Intl formatters so the server render and the client
 * hydration always paint the identical string, whatever machine either runs on.
 */

const TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** ISO `YYYY-MM-DD` in Lagos, comparable with `===` for same-day checks. */
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" });

const DATE_LABEL = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
});

function parse(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "09:14" in Lagos, or an empty string for unparseable input. */
export function lagosTimeLabel(iso: string): string {
  const d = parse(iso);
  return d ? TIME.format(d) : "";
}

/** The Lagos calendar day of an instant, `YYYY-MM-DD`. */
export function lagosDayKey(at: Date): string {
  return DAY.format(at);
}

/** "09:14" for today in Lagos, "26 Jul" for anything older. */
export function lagosWhenLabel(iso: string): string {
  const d = parse(iso);
  if (!d) return "";
  return DAY.format(d) === lagosDayKey(new Date()) ? TIME.format(d) : DATE_LABEL.format(d);
}

/** "Today", "Yesterday", or "26 Jul", for day-grouped lists. */
export function lagosDayLabel(iso: string): string {
  const d = parse(iso);
  if (!d) return "";
  const key = DAY.format(d);
  const now = new Date();
  if (key === lagosDayKey(now)) return "Today";
  if (key === lagosDayKey(new Date(now.getTime() - 86_400_000))) return "Yesterday";
  return DATE_LABEL.format(d);
}
