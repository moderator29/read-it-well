/**
 * B5: THE VIEWING DAY KIT, AS PURE FUNCTIONS. Client-safe, no I/O.
 *
 *   - `viewingIcs`: an .ics built on the device. The title is "Viewing:
 *     {area}", the location is the area and state ONLY (the offline pack's
 *     rule: no street address in an artefact that leaves the app), a link
 *     back to the inspection, and a 90 minute alarm.
 *   - `dayOfViewing`: whether the "Day of" strip shows: the slot's Lagos day,
 *     from midnight until three hours after the slot.
 *   - the two fixed messages ("On my way", "Running late, 15/30/60
 *     minutes") are worded from the dictionary; `lateOptions` pins the three
 *     choices and nothing else.
 */

export const VIEWING_MINUTES = 60;
export const ALARM_MINUTES_BEFORE = 90;
export const LATE_OPTIONS = [15, 30, 60] as const;
export type LateMinutes = (typeof LATE_OPTIONS)[number];

/** `20261014T090000Z` from an ISO instant. */
function icsStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 text escaping. */
export function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets fold with CRLF and a space (RFC 5545 3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export type ViewingIcsInput = {
  inspectionId: string;
  /** ISO instant of the slot. */
  slotAt: string;
  /** "Viewing: Yaba", already worded. */
  title: string;
  /** Area and state only. Never a street. */
  location: string;
  /** The absolute link back to the inspection. */
  url: string;
  /** The alarm's words. */
  alarm: string;
  /** For DTSTAMP; defaults to now. */
  now?: number;
};

export function viewingIcs(input: ViewingIcsInput): string | null {
  const start = Date.parse(input.slotAt);
  if (!Number.isFinite(start)) return null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vallo//Viewing//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:viewing-${input.inspectionId}@vallo`,
    `DTSTAMP:${icsStamp(input.now ?? Date.now())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(start + VIEWING_MINUTES * 60_000)}`,
    `SUMMARY:${icsEscape(input.title)}`,
    `LOCATION:${icsEscape(input.location)}`,
    `URL:${input.url}`,
    `DESCRIPTION:${icsEscape(input.url)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(input.alarm)}`,
    `TRIGGER:-PT${ALARM_MINUTES_BEFORE}M`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** The Lagos calendar day of an instant (UTC+1 all year). */
export function lagosDay(ms: number): string {
  return new Date(ms + 3_600_000).toISOString().slice(0, 10);
}

/** The "Day of" strip: the slot's Lagos day, until three hours after the slot. */
export function dayOfViewing(slotAt: string | null, now: number): boolean {
  if (!slotAt) return false;
  const slot = Date.parse(slotAt);
  if (!Number.isFinite(slot)) return false;
  return lagosDay(slot) === lagosDay(now) && now <= slot + 3 * 3_600_000;
}

/** Still ahead (or under way): the calendar control is offered. */
export function viewingAhead(slotAt: string | null, now: number): boolean {
  if (!slotAt) return false;
  const slot = Date.parse(slotAt);
  return Number.isFinite(slot) && now <= slot + VIEWING_MINUTES * 60_000;
}

export function lateMessage(minutes: LateMinutes, template: string): string {
  return template.replace("{minutes}", String(minutes));
}

/** A file-name-safe name for the download. */
export function icsFileName(area: string): string {
  const slug = area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `vallo-viewing${slug ? `-${slug}` : ""}.ics`;
}
