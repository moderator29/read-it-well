"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  addRentContributor,
  answerRentShare,
  cancelSplitMoveIn,
  removeRentContributor,
} from "@/lib/tenancy/share-actions";
import { settleShareReturn, startShareCheckout } from "@/lib/tenancy/share-checkout";

type Copy = Dictionary["afterTheGate"]["flatmates"];

/**
 * V-86. The lead invites a flatmate to a share, removes one while nothing is
 * paid, or cancels the group's move-in (paid shares go back to their cards);
 * a flatmate accepts or declines, then pays an accepted share by card,
 * straight to the landlord or agent. Every rule is the database door's;
 * these forms collect and report.
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

export function AddFlatmate({
  tenancyId,
  copy,
}: {
  tenancyId: string;
  copy: Copy;
}) {
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
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">
        {copy.addHelp}
      </p>
      <Field label={copy.email}>
        {(control) => (
          <input
            {...control}
            type="email"
            autoComplete="off"
            className="nf-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>
      <Field label={copy.share} error={error ?? undefined}>
        {(control) => (
          <input
            {...control}
            inputMode="decimal"
            className="nf-field"
            value={share}
            onChange={(e) => setShare(e.target.value)}
          />
        )}
      </Field>
      <Button
        type="submit"
        variant="secondary"
        full
        loading={pending}
        disabled={pending || !email.trim() || !share.trim()}
      >
        {copy.addSubmit}
      </Button>
    </form>
  );
}

export function RemoveFlatmate({
  tenancyId,
  contributorId,
  copy,
}: {
  tenancyId: string;
  contributorId: string;
  copy: Copy;
}) {
  const { pending, error, run } = useRun();
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          run(() => removeRentContributor({ tenancyId, contributorId }))
        }
      >
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

/**
 * Pay my own share by card, straight to the landlord or agent. The server
 * opens a Paystack checkout with the split the database computed; the
 * browser is sent to Paystack's page and comes back to settle it.
 */
export function PayShare({
  tenancyId,
  contributorId,
  label,
  help,
}: {
  tenancyId: string;
  /** The flatmate's share row; absent for the lead paying the remainder. */
  contributorId?: string | null;
  label: string;
  help?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [key] = useState(() => crypto.randomUUID());
  return (
    <div className="grid gap-xs">
      {help && <p className="nf-caption">{help}</p>}
      <Button
        variant="primary"
        full
        loading={pending}
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const result = await startShareCheckout({ tenancyId, contributorId: contributorId ?? null, idempotencyKey: key });
            if (!result.ok || !result.data) {
              setError(result.ok ? null : (result.error ?? null));
              return;
            }
            window.location.assign(result.data.authorizationUrl);
          });
        }}
      >
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

/** Back from Paystack with `?paid=1&reference=`: settle the share once, then refresh. */
export function SettleShareOnReturn({ tenancyId, reference }: { tenancyId: string; reference: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void settleShareReturn({ reference, tenancyId }).then((result) => {
      setMessage(result.ok ? null : (result.error ?? null));
      router.refresh();
    });
  }, [reference, tenancyId, router]);
  return message ? (
    <p className="nf-body-sm text-[var(--nf-state-error)]" role="alert">
      {message}
    </p>
  ) : null;
}

/** The lead cancels the group's move-in before it is fully paid; paid shares go back to their cards. */
export function CancelSplit({ tenancyId, copy }: { tenancyId: string; copy: Copy }) {
  const { pending, error, run } = useRun();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {copy.cancelSplit}
      </Button>
    );
  }
  return (
    <form
      className="grid gap-sm"
      data-testid="split-cancel"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => cancelSplitMoveIn({ tenancyId, note }));
      }}
    >
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{copy.cancelHelp}</p>
      <Field label={copy.cancelNote} error={error ?? undefined}>
        {(control) => <input {...control} className="nf-field" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      <Button type="submit" variant="secondary" full loading={pending} disabled={pending}>
        {copy.cancelSplit}
      </Button>
    </form>
  );
}

export function ShareAnswer({
  contributorId,
  copy,
}: {
  contributorId: string;
  copy: Copy;
}) {
  const { pending, error, run } = useRun();
  return (
    <div className="grid gap-xs" data-testid="share-answer">
      <div className="flex flex-wrap gap-sm">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(() => answerRentShare({ contributorId, answer: "accepted" }))
          }
        >
          {copy.accept}
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(() => answerRentShare({ contributorId, answer: "declined" }))
          }
        >
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
