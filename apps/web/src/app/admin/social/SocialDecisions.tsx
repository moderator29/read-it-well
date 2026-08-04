"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  decideArea,
  decideModeratorApplication,
  setAreaPaused,
} from "@/lib/social/admin-actions";

/**
 * The decision controls for Around.
 *
 * A rejection or a decline always carries a note field, and the note is what
 * the person actually receives. An operations console that lets somebody say no
 * without saying why turns every refusal into a mystery, and a mystery is what
 * people appeal.
 *
 * Nothing here is optimistic. These are decisions that reach a real person by
 * notification, so the row waits for the server and then refreshes, rather than
 * showing an approval that might not have landed.
 */
function useDecision() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "That did not go through. Try again.");
        return;
      }
      router.refresh();
    });
  };

  return { pending, error, run };
}

function NoteField({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  disabled: boolean;
}) {
  return (
    <textarea
      className="nf-field min-h-[64px] w-full resize-y text-sm"
      value={value}
      maxLength={400}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-2 text-xs text-[var(--nf-state-error)]">
      {error}
    </p>
  );
}

export function AreaDecision({ areaId, name }: { areaId: string; name: string }) {
  const { pending, error, run } = useDecision();
  const [note, setNote] = useState("");

  return (
    <div className="mt-3">
      <NoteField
        value={note}
        onChange={setNote}
        disabled={pending}
        placeholder={`Why ${name} is or is not opening. If you decline, this is what they read.`}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="nf-btn nf-btn--primary h-9 px-4 text-xs"
          disabled={pending}
          onClick={() => run(() => decideArea({ areaId, decision: "APPROVE", note }))}
        >
          {pending ? "Working" : "Open this place"}
        </button>
        <button
          type="button"
          className="nf-btn nf-btn--ghost h-9 px-4 text-xs"
          disabled={pending || note.trim().length === 0}
          onClick={() => run(() => decideArea({ areaId, decision: "REJECT", note }))}
          title={note.trim().length === 0 ? "Say why first" : undefined}
        >
          Decline
        </button>
      </div>
      {note.trim().length === 0 ? (
        <p className="mt-2 text-xs text-[var(--nf-content-muted)]">
          Declining needs a reason. They receive it word for word.
        </p>
      ) : null}
      <ErrorLine error={error} />
    </div>
  );
}

export function ModeratorDecision({
  applicationId,
  areaName,
}: {
  applicationId: string;
  areaName: string;
}) {
  const { pending, error, run } = useDecision();
  const [note, setNote] = useState("");

  return (
    <div className="mt-3">
      <NoteField
        value={note}
        onChange={setNote}
        disabled={pending}
        placeholder={`A note to them about ${areaName}. If you decline, this is what they read.`}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="nf-btn nf-btn--primary h-9 px-4 text-xs"
          disabled={pending}
          onClick={() =>
            run(() =>
              decideModeratorApplication({ applicationId, decision: "APPROVE", note }),
            )
          }
        >
          {pending ? "Working" : "Approve as moderator"}
        </button>
        <button
          type="button"
          className="nf-btn nf-btn--ghost h-9 px-4 text-xs"
          disabled={pending || note.trim().length === 0}
          onClick={() =>
            run(() =>
              decideModeratorApplication({ applicationId, decision: "DECLINE", note }),
            )
          }
        >
          Decline
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--nf-content-muted)]">
        Approving lets them hide a post while somebody reviews it. It does not let
        them delete one, and it grants nothing outside this place.
      </p>
      <ErrorLine error={error} />
    </div>
  );
}

export function PauseToggle({
  areaId,
  paused,
  name,
}: {
  areaId: string;
  paused: boolean;
  name: string;
}) {
  const { pending, error, run } = useDecision();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="nf-btn nf-btn--ghost h-8 px-3 text-xs"
        onClick={() => setOpen(true)}
      >
        {paused ? "Bring back" : "Pause"}
      </button>
    );
  }

  return (
    <div className="w-full">
      <NoteField
        value={note}
        onChange={setNote}
        disabled={pending}
        placeholder={paused ? `Why ${name} is coming back.` : `Why ${name} is pausing.`}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="nf-btn nf-btn--primary h-8 px-3 text-xs"
          disabled={pending}
          onClick={() => run(() => setAreaPaused({ areaId, paused: !paused, note }))}
        >
          {pending ? "Working" : paused ? "Bring it back" : "Pause it"}
        </button>
        <button
          type="button"
          className="nf-btn nf-btn--ghost h-8 px-3 text-xs"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}
