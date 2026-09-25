"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { setEnquiryStage } from "@/lib/enquiry/actions";
import { LOST_REASONS, STAGES, type DeskStage, type LostReason, type Stage } from "@/lib/enquiry/stage";

/**
 * V-72: THE STAGE, AT THE TOP OF A LISTING THREAD, FOR THE LISTER ONLY.
 *
 * Shows where the enquiry stands and whether an event proved it or the lister
 * set it, and lets the lister move it. Choosing Lost asks for exactly one
 * reason before it can be saved. Every state is drawn: resting, choosing,
 * choosing a reason, saving, and a failed save that says nothing changed.
 * The renter never sees this; the page draws it only for the thread's lister.
 */

type Copy = Dictionary["frontDoor"]["desk"];

export function stageText(stage: DeskStage, copy: Copy): string {
  if (stage.stage === "lost" && stage.lostReason) {
    return copy.lostWithReason.replace("{reason}", copy.reasons[stage.lostReason]);
  }
  return copy.stages[stage.stage];
}

export function StageControl({
  conversationId,
  stage,
  copy,
}: {
  conversationId: string;
  stage: DeskStage;
  copy: Copy;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<Stage>(stage.stage);
  const [reason, setReason] = useState<LostReason | null>(stage.lostReason);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const result = await setEnquiryStage({
        conversationId,
        stage: next,
        ...(next === "lost" && reason ? { reason } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="nf-panel nf-panel--card mx-md my-sm p-card-sm" data-testid="enquiry-stage" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="min-w-0">
          <p className="nf-caption text-[var(--nf-content-muted)]">{copy.stageLabel}</p>
          <p className="mt-3xs">
            <span className={`nf-badge ${stage.stage === "lost" ? "nf-badge--warning" : "nf-badge--info"}`} data-testid="enquiry-stage-now">
              {stageText(stage, copy)}
            </span>
          </p>
          <p className="mt-3xs nf-caption text-[var(--nf-content-muted)]">{stage.source === "proven" ? copy.proven : copy.manual}</p>
        </div>
        {!open && (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            {copy.move}
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-row flex flex-col gap-row">
          <label className="block">
            <span className="nf-label">{copy.move}</span>
            <select
              className="nf-field"
              value={next}
              onChange={(e) => {
                const value = e.target.value as Stage;
                setNext(value);
                if (value !== "lost") setReason(null);
              }}
              data-testid="enquiry-stage-select"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {copy.stages[s]}
                </option>
              ))}
            </select>
          </label>
          {next === "lost" && (
            <fieldset>
              <legend className="nf-label">{copy.lostPrompt}</legend>
              <div className="mt-inline flex flex-col gap-xs">
                {LOST_REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-sm nf-body-sm text-[var(--nf-content-primary)]">
                    <input type="radio" name={`lost-${conversationId}`} value={r} checked={reason === r} onChange={() => setReason(r)} />
                    {copy.reasons[r]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="flex gap-sm">
            <Button variant="primary" loading={pending} disabled={next === "lost" && reason === null} onClick={save}>
              {copy.save}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
              {copy.cancel}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-inline nf-body-sm font-medium text-[var(--nf-state-error)]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
