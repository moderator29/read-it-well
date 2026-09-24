"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { addRentContributor, answerRentShare, payRentShare, removeRentContributor, returnRentShare } from "@/lib/tenancy/share-actions";

type Copy = Dictionary["afterTheGate"]["flatmates"];

/**
 * V-86. The lead invites a flatmate to a share, removes one not yet paid, or
 * returns a paid one when the move-in falls through; a flatmate accepts or
 * declines, then pays an accepted share from their wallet into the lead's. Every rule
 * is the database door's; these forms collect and report.
 */
function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.error ?? null);
        return;
      }
      router.refresh();
    });
  }
  return { pending, error, run };
}

export function AddFlatmate({ tenancyId, copy }: { tenancyId: string; copy: Copy }) {
  const { pending, error, run } = useRun();
  const [email, setEmail] = useState("");
  const [share, setShare] = useState("");
  return (
    <form
      className="grid gap-md"
      data-testid="flatmate-add"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => addRentContributor({ tenancyId, email, shareNaira: share }));
      }}
    >
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{copy.addHelp}</p>
      <Field label={copy.email}>
        {(control) => (
          <input {...control} type="email" autoComplete="off" className="nf-field" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
      </Field>
      <Field label={copy.share} error={error ?? undefined}>
        {(control) => <input {...control} inputMode="decimal" className="nf-field" value={share} onChange={(e) => setShare(e.target.value)} />}
      </Field>
      <Button type="submit" variant="secondary" full loading={pending} disabled={pending || !email.trim() || !share.trim()}>
        {copy.addSubmit}
      </Button>
    </form>
  );
}

export function RemoveFlatmate({ tenancyId, contributorId, copy }: { tenancyId: string; contributorId: string; copy: Copy }) {
  const { pending, error, run } = useRun();
  return (
    <>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => removeRentContributor({ tenancyId, contributorId }))}>
        {copy.remove}
      </Button>
      {error && (
        <p className="nf-caption text-[var(--nf-state-error)]" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function PayShare({ contributorId, label }: { contributorId: string; label: string }) {
  const { pending, error, run } = useRun();
  return (
    <div className="grid gap-xs">
      <Button variant="primary" full loading={pending} disabled={pending} onClick={() => run(() => payRentShare({ contributorId }))}>
        {label}
      </Button>
      {error && (
        <p className="nf-caption text-[var(--nf-state-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ShareAnswer({ contributorId, copy }: { contributorId: string; copy: Copy }) {
  const { pending, error, run } = useRun();
  return (
    <div className="grid gap-xs" data-testid="share-answer">
      <div className="flex flex-wrap gap-sm">
        <Button variant="primary" disabled={pending} onClick={() => run(() => answerRentShare({ contributorId, answer: "accepted" }))}>
          {copy.accept}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => run(() => answerRentShare({ contributorId, answer: "declined" }))}>
          {copy.decline}
        </Button>
      </div>
      {error && (
        <p className="nf-caption text-[var(--nf-state-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ReturnShare({ tenancyId, contributorId, label }: { tenancyId: string; contributorId: string; label: string }) {
  const { pending, error, run } = useRun();
  return (
    <div className="grid gap-xs">
      <Button size="sm" variant="secondary" loading={pending} disabled={pending} onClick={() => run(() => returnRentShare({ tenancyId, contributorId }))}>
        {label}
      </Button>
      {error && (
        <p className="nf-caption text-[var(--nf-state-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
