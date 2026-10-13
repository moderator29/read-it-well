/**
 * AGENT-01: A FOLLOW-UP DATE ON AN ENQUIRY, AS PURE FUNCTIONS.
 *
 * A lister sets "follow up on <date>" and a short note beside the stage they
 * already set (`stage.ts`). The database keeps one row per thread in
 * `enquiry_followups` and sends one notice on the morning of the date
 * (`private.send_followup_reminders`). This file is the part of the rule the
 * app can state without the database, so it is tested rather than trusted,
 * and it is the same rule the RPC `set_enquiry_followup` enforces:
 *
 *   - the date is a calendar day in Lagos, from today to a year ahead; a day
 *     that has already passed is refused;
 *   - the note is at most 200 characters after trimming, and a note without a
 *     date means nothing, so clearing the date clears the note;
 *   - an enquiry that is Let or Lost is never reminded, whatever its date.
 *
 * Client-safe: no server import, so the stage control can validate as the
 * lister types, and the server action validates again.
 */

export const FOLLOWUP_NOTE_MAX = 200;
/** How far ahead a date may be set: today plus this many days. */
export const FOLLOWUP_MAX_DAYS = 365;

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A day as `YYYY-MM-DD` in Lagos (UTC+1, no daylight saving), the same day the database calls "today". */
export function lagosDay(now: Date): string {
  return new Date(now.getTime() + 3_600_000).toISOString().slice(0, 10);
}

/** True for a real calendar day written `YYYY-MM-DD`. */
export function isDay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = DAY.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export type FollowupRefusal = "format" | "past" | "far" | "note";

export type FollowupCheck =
  | { ok: true; dueOn: string | null; note: string | null }
  | { ok: false; reason: FollowupRefusal };

/**
 * Check what a lister asked for, at this moment. A null or empty date is
 * clearing (and drops the note). A date outside today..today+365 is refused,
 * so are a malformed date and a note over the limit.
 */
export function checkFollowup(
  input: { dueOn?: string | null; note?: string | null },
  now: Date,
): FollowupCheck {
  const raw = typeof input.dueOn === "string" ? input.dueOn.trim() : "";
  if (raw === "") return { ok: true, dueOn: null, note: null };
  if (!isDay(raw)) return { ok: false, reason: "format" };
  const today = lagosDay(now);
  if (raw < today) return { ok: false, reason: "past" };
  if (raw > addDays(today, FOLLOWUP_MAX_DAYS)) return { ok: false, reason: "far" };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if ([...note].length > FOLLOWUP_NOTE_MAX) return { ok: false, reason: "note" };
  return { ok: true, dueOn: raw, note: note === "" ? null : note };
}

/** One row of `enquiry_followups` the lister can read. */
export type Followup = { conversationId: string; dueOn: string; note: string | null };

/** Rows from the client, read defensively: a row that is not a real follow-up is dropped, never drawn as one. */
export function parseFollowups(data: unknown): Followup[] {
  if (!Array.isArray(data)) return [];
  const out: Followup[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.conversation_id !== "string" || !isDay(r.due_on)) continue;
    const note = typeof r.note === "string" && r.note.trim() !== "" ? r.note.trim() : null;
    out.push({ conversationId: r.conversation_id, dueOn: r.due_on, note });
  }
  return out;
}

export type FollowupGroups = {
  /** Due on a day before today and still open. */
  overdue: Followup[];
  /** Due today. */
  today: Followup[];
  /** Due after today. */
  upcoming: Followup[];
};

/**
 * Group the follow-ups by when they fall, leaving out every enquiry that is
 * Let or Lost. `stages` is the desk's read (`readDeskStages`); null means it
 * could not be read, and then nothing is left out and nothing is claimed:
 * a follow-up the lister set is shown as they set it.
 * Each group is oldest date first.
 */
export function groupFollowups(
  rows: readonly Followup[],
  stages: ReadonlyMap<string, { stage: string }> | null,
  now: Date,
): FollowupGroups {
  const today = lagosDay(now);
  const out: FollowupGroups = { overdue: [], today: [], upcoming: [] };
  for (const row of rows) {
    const stage = stages?.get(row.conversationId)?.stage;
    if (stage === "let" || stage === "lost") continue;
    if (row.dueOn < today) out.overdue.push(row);
    else if (row.dueOn === today) out.today.push(row);
    else out.upcoming.push(row);
  }
  const byDate = (a: Followup, b: Followup) => a.dueOn.localeCompare(b.dueOn) || a.conversationId.localeCompare(b.conversationId);
  out.overdue.sort(byDate);
  out.today.sort(byDate);
  out.upcoming.sort(byDate);
  return out;
}

/** The conversations the "Due today" filter shows: due today, or earlier and still open. */
export function dueNowIds(groups: FollowupGroups): Set<string> {
  return new Set([...groups.overdue, ...groups.today].map((row) => row.conversationId));
}

/** The words the database's refusals are said in. */
export type FollowupErrorWords = { errNotYours: string; errNote: string; errFar: string; errFailed: string };

/**
 * The database's own refusals, said in the lister's words. `42501` is "not
 * your enquiry"; `22023` is a date outside today..a year or a note over 200
 * characters (told apart by the function's message); anything else is a plain
 * failure that says nothing was saved.
 */
export function messageForDbError(error: { code?: string; message?: string }, w: FollowupErrorWords): string {
  if (error.code === "42501") return w.errNotYours;
  if (error.code === "22023") return /200 characters/i.test(error.message ?? "") ? w.errNote : w.errFar;
  return w.errFailed;
}
