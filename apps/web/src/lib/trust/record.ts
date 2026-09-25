import { formatDate, formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";

/**
 * THE VALLO RECORD (V-34), AS LINES. Pure.
 *
 * The database (`private.lister_record_core`) does the counting and the gating:
 * every counted column comes back null until its denominator reaches five, a
 * stopped lister comes back with only the date of the stop, and an example
 * agent comes back with no row at all. This module turns what is left into
 * sentences, in a fixed order, and adds nothing: a null prints NOTHING. No
 * "0 of 0", no "too few yet" dressed as a fact, no grey placeholder.
 *
 * NEVER ADDED UP. Each line carries its own count and its own window. There is
 * no function in this file that combines two of them, and there must never be:
 * V-21 deleted the score this replaces, and a composite is gamed on its
 * cheapest input.
 *
 * THE REPLY TIME IS A BAND, NOT A NUMBER. A median of 47 minutes printed as
 * "47 minutes" invites a race over one-word replies; "within an hour" says what
 * a renter needs. A median slower than three days prints nothing: the answered
 * line beside it already tells that story with its own denominator.
 */

export type RecordRow = {
  recordCode: string | null;
  displayName: string | null;
  since: string | null;
  stoppedAt: string | null;
  replyMedianMinutes: number | null;
  replied: number | null;
  answeredInDay: number | null;
  enquiries: number | null;
  described: number | null;
  describedOf: number | null;
  lets: number | null;
  /** V-35: confirmed inspections the renter's phone matched at the gate, and of how many. */
  kept: number | null;
  keptOf: number | null;
  /** The lister is stopped. With no date the Record shows nothing at all. */
  stopped: boolean;
};

export type RecordLineKey = "stopped" | "replies" | "answered" | "kept" | "described" | "lets" | "since";

export type RecordLine = { key: RecordLineKey; text: string };

type Copy = Dictionary["trustVisible"]["record"];

/** The smallest count the database will publish; mirrored here so the UI never prints below it. */
export const RECORD_MIN_COUNT = 5;

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function int(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

function validIso(iso: string | null): iso is string {
  return typeof iso === "string" && Number.isFinite(Date.parse(iso));
}

/** One of the three RPCs' rows, narrowed; null when there is no row. */
export function recordFrom(row: unknown): RecordRow | null {
  const r = Array.isArray(row) ? row[0] : row;
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  return {
    recordCode: str(o.record_code),
    displayName: str(o.display_name),
    since: str(o.since),
    stoppedAt: str(o.stopped_at),
    replyMedianMinutes: int(o.reply_median_minutes),
    replied: int(o.replied),
    answeredInDay: int(o.answered_in_day),
    enquiries: int(o.enquiries),
    described: int(o.described),
    describedOf: int(o.described_of),
    lets: int(o.lets),
    kept: int(o.kept),
    keptOf: int(o.kept_of),
    stopped: o.stopped === true || str(o.stopped_at) !== null,
  };
}

/** The band a median first reply falls in, or null past three days. */
export function replyBand(
  minutes: number | null,
): "hour" | "twoHours" | "fewHours" | "day" | "threeDays" | null {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return null;
  if (minutes <= 60) return "hour";
  if (minutes <= 120) return "twoHours";
  if (minutes <= 360) return "fewHours";
  if (minutes <= 1440) return "day";
  if (minutes <= 4320) return "threeDays";
  return null;
}

/** A pair is printable only when both halves are there and the total reaches five. */
function pair(n: number | null, of: number | null): [number, number] | null {
  if (n === null || of === null) return null;
  if (of < RECORD_MIN_COUNT || n > of) return null;
  return [n, of];
}

export function recordLines(record: RecordRow | null, copy: Copy, locale: Locale): RecordLine[] {
  if (!record) return [];
  const fmt = (n: number) => formatNumber(n, locale);

  /* A stopped lister's Record is the stop and nothing else, and a stop the
     database cannot date is nothing at all: no counts, no code. */
  if (record.stopped && !validIso(record.stoppedAt)) return [];
  if (validIso(record.stoppedAt)) {
    const date = formatDate(new Date(record.stoppedAt), locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Lagos",
    });
    return [{ key: "stopped", text: copy.stopped.replace("{date}", date) }];
  }

  const out: RecordLine[] = [];
  const band = record.replied !== null && record.replied >= RECORD_MIN_COUNT ? replyBand(record.replyMedianMinutes) : null;
  if (band) {
    out.push({ key: "replies", text: copy.replies[band].replace("{count}", fmt(record.replied as number)) });
  }
  const answered = pair(record.answeredInDay, record.enquiries);
  if (answered) {
    out.push({
      key: "answered",
      text: copy.answered.replace("{count}", fmt(answered[0])).replace("{total}", fmt(answered[1])),
    });
  }
  const kept = pair(record.kept, record.keptOf);
  if (kept) {
    out.push({
      key: "kept",
      text: copy.kept.replace("{count}", fmt(kept[0])).replace("{total}", fmt(kept[1])),
    });
  }
  const described = pair(record.described, record.describedOf);
  if (described) {
    out.push({
      key: "described",
      text: copy.described.replace("{count}", fmt(described[0])).replace("{total}", fmt(described[1])),
    });
  }
  if (record.lets !== null && record.lets >= RECORD_MIN_COUNT) {
    out.push({ key: "lets", text: copy.lets.replace("{count}", fmt(record.lets)) });
  }
  if (validIso(record.since)) {
    const month = formatDate(new Date(record.since), locale, {
      month: "long",
      year: "numeric",
      timeZone: "Africa/Lagos",
    });
    out.push({ key: "since", text: copy.since.replace("{month}", month) });
  }
  return out;
}

/**
 * A typed Record code, canonicalised, or null.
 *
 * Only with the `VR` prefix: six bare characters are a listing code or a place
 * name, and `readListingReference` already answers those. Same alphabet, same
 * refusal to guess.
 */
export function readRecordCode(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = /^VR([A-Z0-9]{6})$/.exec(cleaned);
  if (!match) return null;
  const body = match[1] ?? "";
  for (const ch of body) if (!ALPHABET.includes(ch)) return null;
  return `VR-${body}`;
}
