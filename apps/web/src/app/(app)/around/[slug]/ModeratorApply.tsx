"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyToModerate,
  withdrawModeratorApplication,
} from "@/lib/social/areas-actions";
import { TextArea } from "@/components/ui/Field";
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
      <div className="nf-card p-md">
        <p className="text-[var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
          You asked to look after {areaName}
        </p>
        <p className="mt-2xs text-[var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          {AREA_COPY.moderatorPending}
        </p>
        <button
          type="button"
          className="nf-btn nf-btn--ghost mt-sm inline-flex h-9 items-center px-md text-[var(--nf-text-overline)]"
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
          <p role="alert" className="mt-xs text-[var(--nf-text-overline)] text-[var(--nf-state-error)]">
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
        className="nf-card w-full p-md text-left transition-colors hover:border-[var(--nf-border-brand)]"
      >
        <p className="text-[var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
          Look after {areaName}
        </p>
        <p className="mt-2xs text-[var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          If you know this place, you can help keep it honest. We read every
          application.
        </p>
      </button>
    );
  }

  const remaining = MODERATOR_REASON_MIN - reason.trim().length;

  return (
    <form
      className="nf-card flex flex-col gap-md p-md"
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
        <h3 className="text-[var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
          Look after {areaName}
        </h3>
        <div className="mt-sm grid gap-md sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nf-state-success)]">
              You can
            </p>
            <ul className="mt-1.5 flex flex-col gap-2xs">
              {MODERATOR_CAN.map((line) => (
                <li key={line} className="text-[var(--nf-text-overline)] leading-snug text-[var(--nf-content-secondary)]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
              You cannot
            </p>
            <ul className="mt-1.5 flex flex-col gap-2xs">
              {MODERATOR_CANNOT.map((line) => (
                <li key={line} className="text-[var(--nf-text-overline)] leading-snug text-[var(--nf-content-secondary)]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <TextArea
        label="What do you know about this place?"
        value={reason}
        maxLength={MODERATOR_REASON_MAX}
        rows={4}
        placeholder="How long you have been around here, which streets you know, and why you want to do it."
        onChange={(event) => setReason(event.target.value)}
        error={fieldErrors.reason}
        hint={
          remaining > 0
            ? `${remaining} more characters`
            : `${reason.trim().length}/${MODERATOR_REASON_MAX}`
        }
      />

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--nf-radius-md)] border border-[var(--nf-state-error)] bg-[var(--nf-state-error-surface)] px-sm py-xs text-[var(--nf-text-body-sm)] text-[var(--nf-content-primary)]"
        >
          {error}
        </p>
      ) : null}

      <div className="flex gap-xs">
        <button
          type="submit"
          className="nf-btn nf-btn--primary h-10 flex-1 text-[var(--nf-text-body-sm)]"
          disabled={pending || remaining > 0}
        >
          {pending ? "Sending" : "Send application"}
        </button>
        <button
          type="button"
          className="nf-btn nf-btn--ghost h-10 px-md text-[var(--nf-text-body-sm)]"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Not now
        </button>
      </div>
    </form>
  );
}
