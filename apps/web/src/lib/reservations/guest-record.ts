import { plural, type Locale, type PluralForms } from "@vallo/i18n/core";

/**
 * KEPT AND MISSED TABLES, AS A VENUE SEES THEM (RESTAURANT-06).
 *
 * On a table request, the venue sees how many past tables this diner kept and
 * how many they missed, across Vallo, in the last 12 months. The founder's
 * ruling (13 October 2026): counts only, no venue names, no dates, and nothing
 * at all for a first-time diner. The venue decides what to make of it; Vallo
 * never blocks anybody on it.
 *
 * The database answers through `public.reservation_guest_records(uuid[])`
 * (`supabase/migrations/pending/p1_d_reservation_guest_records.sql`), on the
 * caller's own session: only reservations the caller hosts come back, so a
 * host never sees counts for another venue's request. Kept is a table marked
 * seated, missed is a table marked a no-show, and a table under an open
 * dispute counts as neither.
 *
 * Until the lead regenerates `database.types.ts` after applying the SQL, the
 * RPC is typed here by a small wrapper rather than by editing the shared types.
 *
 * Every failure reads as "no line": a dropped read, the function not deployed
 * yet, a malformed row. A wrong count is worse than no count, and a request
 * card without the line is exactly what a venue sees today.
 */

export type GuestRecord = { kept: number; missed: number };

/** The most ids one call may carry; the database refuses more. */
export const GUEST_RECORD_BATCH = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The one RPC this file calls, typed locally (see the header). */
type GuestRecordsRpc = {
  rpc: (
    fn: "reservation_guest_records",
    args: { p_reservations: string[] },
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

function count(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * The RPC's rows, read defensively, keyed by reservation id. A row that is not
 * one (a missing id, a negative or fractional count) is dropped, never guessed.
 * A first-time diner (0 kept, 0 missed) is dropped too, so the map holds only
 * lines worth showing.
 */
export function parseGuestRecords(data: unknown): Map<string, GuestRecord> {
  const out = new Map<string, GuestRecord>();
  if (!Array.isArray(data)) return out;
  for (const row of data) {
    if (row === null || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.reservation_id === "string" && UUID.test(r.reservation_id) ? r.reservation_id : null;
    const kept = count(r.kept);
    const missed = count(r.missed);
    if (!id || kept === null || missed === null) continue;
    if (kept === 0 && missed === 0) continue;
    out.set(id, { kept, missed });
  }
  return out;
}

/**
 * The records for these reservations, in one call. Ids that are not uuids are
 * left out, duplicates are folded, and at most `GUEST_RECORD_BATCH` are sent.
 * `report` is told about a returned error (the caller wires the read-error
 * reporter); it is never told about the empty answer, which is not an error.
 */
export async function readGuestRecords(
  client: unknown,
  reservationIds: readonly string[],
  report?: (error: unknown) => unknown,
): Promise<Map<string, GuestRecord>> {
  const ids = [...new Set(reservationIds.filter((id) => UUID.test(id)))].slice(0, GUEST_RECORD_BATCH);
  if (ids.length === 0) return new Map();
  try {
    const { data, error } = await (client as GuestRecordsRpc).rpc("reservation_guest_records", {
      p_reservations: ids,
    });
    if (error) {
      await report?.(error);
      return new Map();
    }
    return parseGuestRecords(data);
  } catch (error) {
    await report?.(error);
    return new Map();
  }
}

/** The words the line is built from, in the reader's language (`tableDesk.record`). */
export type GuestRecordWords = {
  /** "Kept {kept}, missed {missed}, last 12 months" */
  line: string;
  /** "Kept {kept}, last 12 months" (nothing missed) */
  keptOnly: string;
  /** "Missed {missed}, last 12 months" (nothing kept) */
  missedOnly: string;
  /** The counted tables: "1 table" / "{count} tables". */
  tables: PluralForms;
};

/**
 * The one quiet line on a request card, or null when there is nothing to say
 * (no record, or a first-time diner). Counts are plural through the
 * dictionary's own forms, never a hand-written "s".
 */
export function guestRecordLine(
  record: GuestRecord | null | undefined,
  words: GuestRecordWords,
  locale: Locale,
): string | null {
  if (!record) return null;
  const { kept, missed } = record;
  if (kept <= 0 && missed <= 0) return null;
  const keptText = plural(kept, words.tables, locale);
  const missedText = plural(missed, words.tables, locale);
  if (missed <= 0) return words.keptOnly.replace("{kept}", keptText);
  if (kept <= 0) return words.missedOnly.replace("{missed}", missedText);
  return words.line.replace("{kept}", keptText).replace("{missed}", missedText);
}
