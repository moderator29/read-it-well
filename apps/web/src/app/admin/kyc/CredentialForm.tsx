"use client";

import { useState, useTransition } from "react";
import { recordCredential } from "@/lib/trust/credentials-actions";

/**
 * V-87: record a credential checked by hand on the public register. Optional
 * for the lister and never a gate: this only dates a fact the desk checked.
 * Every state is drawn: choosing, recording, recorded, and the refusal.
 */
export function CredentialForm({ subjectId }: { subjectId: string }) {
  const [kind, setKind] = useState<"lasrera" | "esvarbon" | "cac_director">("lasrera");
  const [number, setNumber] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setNote(null);
    startTransition(async () => {
      const result = await recordCredential({
        subjectId,
        kind,
        number,
        ...(kind === "cac_director" ? { company } : {}),
      });
      setNote(result.ok ? { ok: true, text: "Recorded, dated today." } : { ok: false, text: result.error });
    });
  }

  return (
    <div className="mt-sm grid max-w-md gap-xs" data-testid="credential-form">
      <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
        Record a credential checked on the public register
      </p>
      <label className="grid gap-3xs text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
        Credential
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as typeof kind)}
          className="nf-field min-h-[44px] w-full"
        >
          <option value="lasrera">LASRERA registration</option>
          <option value="esvarbon">ESVARBON registration</option>
          <option value="cac_director">CAC directorship</option>
        </select>
      </label>
      <label className="grid gap-3xs text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
        Number as the register shows it
        <input value={number} onChange={(event) => setNumber(event.target.value)} className="nf-field min-h-[44px] w-full" />
      </label>
      {kind === "cac_director" && (
        <label className="grid gap-3xs text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
          Company name at the CAC
          <input value={company} onChange={(event) => setCompany(event.target.value)} className="nf-field min-h-[44px] w-full" />
        </label>
      )}
      <button type="button" onClick={submit} disabled={pending || number.trim().length < 2} className="nf-btn nf-btn--secondary nf-btn--sm">
        {pending ? "Recording" : "Record the check"}
      </button>
      {note && (
        <p
          role={note.ok ? "status" : "alert"}
          className={`text-[length:var(--nf-text-body-sm)] ${note.ok ? "text-[var(--nf-content-primary)]" : "text-[var(--nf-state-error)]"}`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
