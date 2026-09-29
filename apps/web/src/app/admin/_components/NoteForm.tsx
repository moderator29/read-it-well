"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { addMemberNote } from "@/lib/admin/notes-actions";

export function NoteForm({
  subjectId,
  path,
  scopes,
}: {
  subjectId: string;
  path: string;
  /** The scopes the writer holds, as options to restrict a note to. */
  scopes: { value: string; label: string }[];
}) {
  const [body, setBody] = useState("");
  const [scope, setScope] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mt-xs grid gap-2xs"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const result = await addMemberNote({ subjectId, body, scope: scope || null, path });
          if (!result.ok) setError(result.error);
          else {
            setBody("");
            setScope("");
            router.refresh();
          }
        });
      }}
    >
      <label className="nf-label" htmlFor={`note-${subjectId}`}>
        Add an internal note (staff only; the member never sees it)
      </label>
      <textarea
        id={`note-${subjectId}`}
        className="nf-input"
        rows={2}
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-xs">
        <select className="nf-input w-auto" value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Who can read it">
          <option value="">Every member of staff can read it</option>
          {scopes.map((s) => (
            <option key={s.value} value={s.value}>
              Only {s.label} and admins
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" size="sm" disabled={pending || body.trim().length < 3}>
          Save note
        </Button>
      </div>
      {error ? (
        <p className="nf-caption text-[var(--nf-state-error)]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
