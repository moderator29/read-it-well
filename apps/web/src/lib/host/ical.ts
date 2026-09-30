/**
 * iCAL IN AND OUT, AS PURE TEXT (C2, 30 September 2026).
 *
 * Airbnb, Booking.com, Vrbo and Google Calendar all speak the same small
 * subset of RFC 5545 for availability: one VEVENT per stay or block, all-day
 * DTSTART and DTEND, where DTEND is the morning the guest leaves, so the
 * nights are DTSTART up to but not including DTEND. That subset is all this
 * file reads and all it writes.
 *
 * WHAT GOES OUT carries no guest's name, no price and no booking reference:
 * a night is "Booked on Vallo" or "Closed on Vallo" and nothing else, because
 * the feed's URL is a secret that the host pastes into another company's
 * system, and anybody that system shows it to can read it.
 *
 * WHAT COMES IN is only turned into a list of nights. Nothing in a feed is
 * trusted as anything but dates: a SUMMARY is never shown, stored or logged.
 */

import { addDays, isIsoDate, type IsoDate } from "./rate-calendar";

/** The longest feed read, in bytes. Airbnb's year of blocks is well under 100 KB. */
export const MAX_FEED_BYTES = 2_000_000;

/** The most nights one event may block: a longer one is almost always a typo. */
export const MAX_EVENT_NIGHTS = 370;

/**
 * The sites a host may link. A calendar link is fetched by our server, so an
 * open list would let anybody make Vallo fetch any address they liked; this
 * list is the sites hosts actually list on. `other` still has to be one of
 * these hosts.
 */
export const ALLOWED_FEED_HOSTS: readonly string[] = [
  "airbnb.com",
  "airbnb.co.uk",
  "airbnb.ca",
  "airbnb.com.au",
  "airbnb.ie",
  "airbnb.fr",
  "airbnb.de",
  "booking.com",
  "vrbo.com",
  "homeaway.com",
  "expedia.com",
  "calendar.google.com",
  "outlook.live.com",
  "outlook.office365.com",
  "hostaway.com",
  "guesty.com",
  "lodgify.com",
  "smoobu.com",
  "beds24.com",
];

export type FeedSource = "airbnb" | "booking_com" | "other";

export const FEED_SOURCES: readonly { value: FeedSource; label: string }[] = [
  { value: "airbnb", label: "Airbnb" },
  { value: "booking_com", label: "Booking.com" },
  { value: "other", label: "Another site" },
];

/** A feed link a host may add, or the sentence that says why not. */
export function checkFeedUrl(raw: string): { ok: true; url: string } | { ok: false; reason: string } {
  const trimmed = raw.trim().replace(/^webcal:\/\//i, "https://");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "That is not a link. Copy the calendar link from the other site and paste it here." };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "The link has to start with https://." };
  }
  if (parsed.username || parsed.password || parsed.port) {
    return { ok: false, reason: "That link cannot be used. Copy the calendar export link from the other site." };
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const allowed = ALLOWED_FEED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) {
    return {
      ok: false,
      reason:
        "We can read calendars from Airbnb, Booking.com, Vrbo, Expedia, Google and Outlook calendars, and the main channel managers. Paste the export link from one of those.",
    };
  }
  if (trimmed.length > 2000) return { ok: false, reason: "That link is too long to be a calendar link." };
  return { ok: true, url: parsed.toString() };
}

/* ------------------------------------------------------------- reading */

/** Undo RFC 5545 line folding: a line starting with a space or tab continues the one before. */
export function unfold(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) out[out.length - 1] += line.slice(1);
    else out.push(line);
  }
  return out;
}

/** "20261003", "20261003T140000Z", "20261003T140000" to "2026-10-03"; null otherwise. */
export function icalDate(value: string): IsoDate | null {
  const m = /^(\d{4})(\d{2})(\d{2})(T\d{6}Z?)?$/.exec(value.trim());
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  return isIsoDate(date) ? date : null;
}

export type FeedRead = { ok: true; nights: IsoDate[]; events: number } | { ok: false; reason: string };

/**
 * The nights a feed holds shut, from `from` to `to` inclusive, sorted and
 * unique. A cancelled event (STATUS:CANCELLED) holds nothing. An event with
 * no DTEND holds its first night. A date-time is read as its date: sites put
 * check-in times on events, and the night is what matters.
 */
export function readFeed(text: string, window: { from: IsoDate; to: IsoDate }): FeedRead {
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    return { ok: false, reason: "That link did not return a calendar." };
  }
  const nights = new Set<IsoDate>();
  let events = 0;
  let inEvent = false;
  let start: IsoDate | null = null;
  let end: IsoDate | null = null;
  let cancelled = false;
  for (const line of unfold(text)) {
    const upper = line.toUpperCase();
    if (upper.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      start = null;
      end = null;
      cancelled = false;
      continue;
    }
    if (!inEvent) continue;
    if (upper.startsWith("END:VEVENT")) {
      inEvent = false;
      events += 1;
      if (!start || cancelled) continue;
      const last = end && end > start ? addDays(end, -1) : start;
      let n = 0;
      for (let d = start; d <= last && n < MAX_EVENT_NIGHTS; d = addDays(d, 1), n += 1) {
        if (d >= window.from && d <= window.to) nights.add(d);
      }
      continue;
    }
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = upper.slice(0, colon).split(";")[0];
    const value = line.slice(colon + 1);
    if (name === "DTSTART") start = icalDate(value);
    else if (name === "DTEND") end = icalDate(value);
    else if (name === "STATUS") cancelled = value.trim().toUpperCase() === "CANCELLED";
  }
  return { ok: true, nights: [...nights].sort(), events };
}

/* ------------------------------------------------------------- writing */

export type FeedNight = { date: IsoDate; kind: "booked" | "closed" };

function compact(date: IsoDate): string {
  return date.replace(/-/g, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold a content line at 75 octets, as RFC 5545 asks. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

/** Consecutive nights of the same kind, as one event each. */
export function runsOfNights(nights: readonly FeedNight[]): { from: IsoDate; to: IsoDate; kind: FeedNight["kind"] }[] {
  const sorted = [...nights].sort((a, b) => a.date.localeCompare(b.date));
  const runs: { from: IsoDate; to: IsoDate; kind: FeedNight["kind"] }[] = [];
  for (const night of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.kind === night.kind && addDays(last.to, 1) === night.date) last.to = night.date;
    else runs.push({ from: night.date, to: night.date, kind: night.kind });
  }
  return runs;
}

/**
 * The export: one all-day event per run of nights. The UID is stable for a
 * run (its kind and first night), so a site that re-reads the feed updates
 * the event instead of piling up copies.
 */
export function buildFeed(input: { name: string; token: string; nights: readonly FeedNight[]; now: Date }): string {
  const stamp = input.now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vallo//Host calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(`Vallo: ${input.name}`)}`,
  ];
  const tag = input.token.slice(0, 12);
  for (const run of runsOfNights(input.nights)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${run.kind}-${compact(run.from)}-${tag}@vallo`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(run.from)}`,
      `DTEND;VALUE=DATE:${compact(addDays(run.to, 1))}`,
      `SUMMARY:${run.kind === "booked" ? "Booked on Vallo" : "Closed on Vallo"}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** A calendar feed token: 64 hex characters, nothing else. */
export function isFeedToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
