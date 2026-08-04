"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyToModerate,
  withdrawModeratorApplication,
} from "@/lib/social/areas-actions";
import {
  AREA_COPY,
  MODERATOR_CAN,
  MODERATOR_CANNOT,
  MODERATOR_REASON_MIN,
  MODERATOR_REASON_MAX,
} from "@/lib/social/areas-schema";

/**
 * Apply to look after a place.
 *
 * The role's limits are stated on the form rather than in a help page, because
 * the moment somebody is deciding whether to ask is the only moment they will
 * read them. Chief among them: a moderator can hide a post and can never delete
 * one. That is the owner's ruling and it is also what makes the role safe to
 * hand to a stranger who lives on the right street.
 */
export function ModeratorApply({
  areaId,
  areaName,
  pendingApplication,
}: {
  areaId: string;
  areaName: string;
  pendingApplication: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  if (pendingApplication) {
    return (
      <div className="nf-card p-4">
        <p className="text-sm font-semibold text-[var(--nf-content-primary)]">
          You asked to look after {areaName}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--nf-content-muted)]">
          {AREA_COPY.moderatorPending}
        </p>
        <button
          type="button"
          className="nf-btn nf-btn--ghost mt-3 inline-flex h-9 items-center px-4 text-xs"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await withdrawModeratorApplication({ areaId });
              if (result.ok) router.refresh();
              else setError(result.error);
            })
          }
        >
          {pending ? "Withdrawing" : "Withdraw it"}
        </button>
        {error ? (
          <p role="alert" className="mt-2 text-xs text-[var(--nf-state-error)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="nf-card w-full p-4 text-left transition-colors hover:border-[var(--nf-border-brand)]"
      >
        <p className="text-sm font-semibold text-[var(--nf-content-primary)]">
          Look after {areaName}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--nf-content-muted)]">
          If you know this place, you can help keep it honest. We read every
          application.
        </p>
      </button>
    );
  }

  const remaining = MODERATOR_REASON_MIN - reason.trim().length;

  return (
    <form
      className="nf-card flex flex-col gap-4 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        setError(null);
        setFieldErrors({});
        startTransition(async () => {
          const result = await applyToModerate({ areaId, reason });
          if (result.ok) {
            setOpen(false);
            setReason("");
            router.refresh();
            return;
          }
          setError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
        });
      }}
    >
      <div>
        <h3 className="text-sm font-semibold text-[var(--nf-content-primary)]">
          Look after {areaName}
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nf-state-success)]">
              You can
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {MODERATOR_CAN.map((line) => (
                <li key={line} className="text-xs leading-snug text-[var(--nf-content-secondary)]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
              You cannot
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {MODERATOR_CANNOT.map((line) => (
                <li key={line} className="text-xs leading-snug text-[var(--nf-content-secondary)]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-[var(--nf-content-primary)]">
          What do you know about this place?
        </span>
        <textarea
          className="nf-field min-h-[110px] resize-y"
          value={reason}
          maxLength={MODERATOR_REASON_MAX}
          placeholder="How long you have been around here, which streets you know, and why you want to do it."
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={Boolean(fieldErrors.reason)}
        />
        {fieldErrors.reason ? (
          <span className="text-xs text-[var(--nf-state-error)]">{fieldErrors.reason}</span>
        ) : (
          <span className="nf-numeric text-xs text-[var(--nf-content-muted)]">
            {remaining > 0
              ? `${remaining} more characters`
              : `${reason.trim().length}/${MODERATOR_REASON_MAX}`}
          </span>
        )}
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--nf-radius-md)] border border-[var(--nf-state-error)] bg-[var(--nf-state-error-surface)] px-3 py-2 text-sm text-[var(--nf-content-primary)]"
        >
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          className="nf-btn nf-btn--primary h-10 flex-1 text-sm"
          disabled={pending || remaining > 0}
        >
          {pending ? "Sending" : "Send application"}
        </button>
        <button
          type="button"
          className="nf-btn nf-btn--ghost h-10 px-4 text-sm"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Not now
        </button>
      </div>
    </form>
  );
}
