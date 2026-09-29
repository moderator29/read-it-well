import "server-only";

import { resolveSession } from "../actions/session";
import { STAFF_SCOPES, type StaffScope } from "./guard";

/**
 * INTERNAL NOTES ABOUT A MEMBER (public.member_notes).
 *
 * Read and written only through `staff_member_notes` / `staff_add_member_note`,
 * on the staff member's own session, so the database decides who may see
 * which note (a note restricted to a scope is shown only to its holders and to
 * admins). Notes are append-only.
 */
export type MemberNote = {
  id: string;
  body: string;
  createdAt: string;
  author: string;
  scope: StaffScope | null;
  mine: boolean;
};

export type MemberNotesRead = { state: "ok"; notes: MemberNote[] } | { state: "unavailable" };

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

function toNote(row: Record<string, unknown>): MemberNote {
  return {
    id: String(row.id),
    body: String(row.body ?? ""),
    createdAt: String(row.created_at),
    author: String(row.author_name ?? "A member of staff"),
    scope: STAFF_SCOPES.includes(row.scope as StaffScope) ? (row.scope as StaffScope) : null,
    mine: row.mine === true,
  };
}

export type MemberNotesBatch = { state: "ok"; bySubject: Map<string, MemberNote[]> } | { state: "unavailable" };

/**
 * The notes on many members in ONE call (`staff_member_notes_for`, the same
 * visibility rules), for a desk that lists people: every row shows its notes
 * without a read per row. At most 200 people.
 */
export async function readMemberNotesFor(subjectIds: string[]): Promise<MemberNotesBatch> {
  const ids = [...new Set(subjectIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 200);
  if (ids.length === 0) return { state: "ok", bySubject: new Map() };
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "unavailable" };
  try {
    const { data, error } = await (session.supabase as unknown as Rpc).rpc("staff_member_notes_for", { p_subjects: ids });
    if (error || !Array.isArray(data)) return { state: "unavailable" };
    const bySubject = new Map<string, MemberNote[]>();
    for (const row of data as Record<string, unknown>[]) {
      const subject = String(row.subject_id);
      const list = bySubject.get(subject) ?? [];
      list.push(toNote(row));
      bySubject.set(subject, list);
    }
    return { state: "ok", bySubject };
  } catch {
    return { state: "unavailable" };
  }
}

/** One member's notes out of a batch read, in the shape a single read returns. */
export function notesOf(batch: MemberNotesBatch, subjectId: string): MemberNotesRead {
  return batch.state === "ok" ? { state: "ok", notes: batch.bySubject.get(subjectId) ?? [] } : { state: "unavailable" };
}

export async function readMemberNotes(subjectId: string): Promise<MemberNotesRead> {
  if (!/^[0-9a-f-]{36}$/i.test(subjectId)) return { state: "unavailable" };
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "unavailable" };
  try {
    const { data, error } = await (session.supabase as unknown as Rpc).rpc("staff_member_notes", { p_subject: subjectId });
    if (error || !Array.isArray(data)) return { state: "unavailable" };
    return {
      state: "ok",
      notes: (data as Record<string, unknown>[]).map(toNote),
    };
  } catch {
    return { state: "unavailable" };
  }
}
