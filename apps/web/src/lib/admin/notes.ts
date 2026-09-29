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

export async function readMemberNotes(subjectId: string): Promise<MemberNotesRead> {
  if (!/^[0-9a-f-]{36}$/i.test(subjectId)) return { state: "unavailable" };
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "unavailable" };
  try {
    const { data, error } = await (session.supabase as unknown as Rpc).rpc("staff_member_notes", { p_subject: subjectId });
    if (error || !Array.isArray(data)) return { state: "unavailable" };
    return {
      state: "ok",
      notes: (data as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        body: String(row.body ?? ""),
        createdAt: String(row.created_at),
        author: String(row.author_name ?? "A member of staff"),
        scope: STAFF_SCOPES.includes(row.scope as StaffScope) ? (row.scope as StaffScope) : null,
        mine: row.mine === true,
      })),
    };
  } catch {
    return { state: "unavailable" };
  }
}
