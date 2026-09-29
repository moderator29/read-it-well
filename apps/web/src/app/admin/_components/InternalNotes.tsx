import { STAFF_SCOPES, STAFF_SCOPE_LABEL, requireConsole } from "@/lib/admin/guard";
import { readMemberNotes } from "@/lib/admin/notes";
import { NoteForm } from "./NoteForm";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

/**
 * INTERNAL NOTES about one member, for whoever on the team opens their case
 * next: what was said, what was promised, what to watch for. Staff only; the
 * member never sees them. A note restricted to a desk shows only to that
 * desk's holders and admins. Append-only, and every note is in the audit log.
 */
export async function InternalNotes({ subjectId, path }: { subjectId: string; path: string }) {
  const [read, door] = await Promise.all([readMemberNotes(subjectId), requireConsole()]);
  if (door.state !== "console") return null;
  const held =
    door.staff.isAdmin || door.staff.isSuperAdmin ? [...STAFF_SCOPES] : door.staff.scopes;
  return (
    <section className="nf-panel nf-panel--card mt-row p-card" data-testid="internal-notes" aria-label="Internal notes">
      <h3 className="nf-admin-panel__title">Internal notes</h3>
      {read.state !== "ok" ? (
        <p className="nf-body">Notes could not be read just now. Refresh to try again.</p>
      ) : read.notes.length === 0 ? (
        <p className="nf-body text-[var(--nf-content-secondary)]">No notes yet.</p>
      ) : (
        <ul className="mt-xs grid gap-xs">
          {read.notes.map((note) => (
            <li key={note.id} className="nf-body">
              <p className="whitespace-pre-wrap">{note.body}</p>
              <p className="nf-caption text-[var(--nf-content-secondary)]">
                {note.mine ? "You" : note.author} · {when(note.createdAt)}
                {note.scope ? ` · only ${STAFF_SCOPE_LABEL[note.scope]} and admins` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <NoteForm subjectId={subjectId} path={path} scopes={held.map((s) => ({ value: s, label: STAFF_SCOPE_LABEL[s] }))} />
    </section>
  );
}
