"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import Link from "next/link";
import { reportSomething, type ReportReceipt } from "@/lib/reports/actions";
import {
  DETAILS_MAX,
  REPORT_CATEGORY_COPY,
  REPORT_CATEGORY_ORDER,
  type ReportCategory,
  type ReportTarget,
} from "@/lib/reports/schema";
import type { ActionResult } from "@/lib/actions/envelope";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Report this.
 *
 * A full-page drawer, because a half sheet over a listing photo is not the
 * frame for telling us somebody asked you to send money to a personal account.
 * It follows the filter drawer exactly: a real dialog, escape closes it, the
 * body stops scrolling behind it, and focus lands on the way out.
 *
 * The categories are the ones the database will accept, imported from the same
 * client-safe module the server action validates against, so a new category is
 * one edit in one file and cannot be added to one half only.
 *
 * Signed out is a designed state rather than a hidden control: the reason is
 * stated (a report has to belong to somebody) and the way in is offered.
 */
export function ReportSheet({
  targetType,
  targetId,
  targetLabel,
  signedIn,
}: {
  targetType: ReportTarget;
  targetId: string;
  /** What is being reported, in the heading, e.g. the listing title. */
  targetLabel: string;
  signedIn: boolean;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [state, formAction, pending] = useActionState<
    ActionResult<ReportReceipt> | null,
    FormData
  >(reportSomething, null);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus();
  }, []);

  useOverlay({ open, onClose: close, panelRef, autoFocus: false });

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        data-testid="report-opener"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-content-muted)] underline underline-offset-4 transition-colors hover:text-[var(--nf-content-secondary)]"
      >
        <UiIcon name="bell" size={16} className="shrink-0" />
        Report this listing
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Report">
          <button
            type="button"
            aria-label="Close report"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            ref={panelRef}
            data-testid="report-sheet"
            className="absolute inset-0 flex flex-col bg-[var(--nf-surface-primary)]"
          >
            <header className="nf-glass flex items-center gap-3 border-b border-[var(--nf-border-subtle)] px-4 py-3">
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close report"
                className="nf-icon-btn h-11 w-11"
              >
                <UiIcon name="arrow-left" size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-bold text-[var(--nf-content-primary)]">
                  Report this listing
                </p>
                <p className="truncate text-[0.75rem] text-[var(--nf-content-muted)]">
                  {targetLabel}
                </p>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="mx-auto grid max-w-2xl gap-4 pb-8">
                {state?.ok ? (
                  <div className="nf-card p-6 text-center" data-testid="report-filed">
                    <span className="mx-auto block h-16 w-16">
                      <BrandIcon name="shield-check" fill />
                    </span>
                    <p className="mt-3.5 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
                      Thank you, we have it
                    </p>
                    <p className="mx-auto mt-2 max-w-[42ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                      Our team reviews every report. You will not have to chase this,
                      and the host is never told who reported them.
                    </p>
                    <button type="button" onClick={close} className="nf-btn nf-btn--glass mt-5">
                      Back to the listing
                    </button>
                  </div>
                ) : !signedIn ? (
                  <div className="nf-card p-6 text-center">
                    <span className="mx-auto block h-16 w-16">
                      <BrandIcon name="shield-lock" fill />
                    </span>
                    <p className="mt-3.5 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
                      Sign in to report this
                    </p>
                    <p className="mx-auto mt-2 max-w-[42ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                      A report belongs to somebody, which is what stops the queue filling
                      with noise and what lets us come back to you about it. The host is
                      never told who reported them.
                    </p>
                    <Link href="/sign-in" className="nf-btn nf-btn--primary mt-5">
                      Sign in
                    </Link>
                  </div>
                ) : (
                  <form action={formAction} noValidate className="grid gap-4">
                    <input type="hidden" name="targetType" value={targetType} />
                    <input type="hidden" name="targetId" value={targetId} />

                    <fieldset className="nf-card p-4">
                      <legend className="px-1 text-[0.875rem] font-bold text-[var(--nf-content-primary)]">
                        What happened?
                      </legend>
                      <div className="mt-2 grid gap-1.5">
                        {REPORT_CATEGORY_ORDER.map((code) => {
                          const copy = REPORT_CATEGORY_COPY[code];
                          const active = category === code;
                          return (
                            <label
                              key={code}
                              className={`flex cursor-pointer items-start gap-3 rounded-[var(--nf-radius-md)] border p-3 transition-colors ${
                                active
                                  ? "border-[var(--nf-brand-primary)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_10%,transparent)]"
                                  : "border-[var(--nf-border-subtle)]"
                              }`}
                            >
                              <input
                                type="radio"
                                name="category"
                                value={code}
                                checked={active}
                                onChange={() => setCategory(code)}
                                className="mt-1 h-4 w-4 shrink-0 accent-[var(--nf-brand-primary)]"
                              />
                              <span className="min-w-0">
                                <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                                  {copy.label}
                                </span>
                                <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                                  {copy.hint}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="nf-card p-4">
                      <label
                        htmlFor={`${uid}-details`}
                        className="text-[0.875rem] font-bold text-[var(--nf-content-primary)]"
                      >
                        Anything else we should know
                      </label>
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                        Optional, and it helps. Dates, amounts and account numbers are
                        exactly the detail that makes a report actionable.
                      </p>
                      <textarea
                        id={`${uid}-details`}
                        name="details"
                        rows={4}
                        maxLength={DETAILS_MAX}
                        className="nf-field mt-2.5 resize-y"
                        placeholder="He asked me to transfer to a personal account before any inspection."
                      />
                    </div>

                    {state && !state.ok && (
                      <p
                        role="alert"
                        className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
                      >
                        {state.error}
                      </p>
                    )}

                    <div className="grid gap-2">
                      <button
                        type="submit"
                        disabled={pending || category === null}
                        className="nf-btn nf-btn--primary w-full disabled:opacity-60"
                      >
                        {pending ? "Sending your report..." : "Send report"}
                      </button>
                      <button type="button" onClick={close} className="nf-btn nf-btn--ghost w-full">
                        Cancel
                      </button>
                    </div>

                    <p className="text-center text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
                      The host is never told who reported them. If you are in danger,
                      contact the emergency services first.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
