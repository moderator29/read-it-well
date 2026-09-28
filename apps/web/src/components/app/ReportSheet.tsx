"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import Link from "next/link";
import { reportSomething, type ReportReceipt } from "@/lib/reports/actions";
import {
  DETAILS_MAX,
  REPORT_CATEGORY_COPY,
  REPORT_CATEGORY_ORDER,
  REPORT_TARGET_NOUN,
  type ReportCategory,
  type ReportTarget,
} from "@/lib/reports/schema";
import type { ActionResult } from "@/lib/actions/envelope";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { panelClass } from "@/components/ui/Panel";
import { responseTimeFor } from "@/lib/trust/standards";
import { useClientCopy } from "@/lib/i18n/client-copy";

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
 *
 * THE NOUN IS NOT BAKED IN ANY MORE. This sheet said "listing" in three
 * places, which was true while a listing was the only thing anybody could
 * report and became a lie the moment a conversation could be. The noun comes
 * from `REPORT_TARGET_NOUN`, so the heading, the opener and the way back all
 * name the same thing and cannot drift apart.
 *
 * `trigger` decides what opens it. "link" is the underlined line the listing
 * page draws under the fold. "row" is a full-width row for a sheet that is
 * already open, which is how a conversation offers it: the options sheet has
 * rows and a small underlined link inside one would read as a footnote rather
 * than as the safety control it is.
 */
export function ReportSheet({
  targetType,
  targetId,
  targetLabel,
  signedIn,
  trigger = "link",
  onOpen,
}: {
  targetType: ReportTarget;
  targetId: string;
  /** What is being reported, in the heading, e.g. the listing title. */
  targetLabel: string;
  signedIn: boolean;
  /** How the control is drawn. See the note above. */
  trigger?: "link" | "row";
  /** Called when the sheet opens, so a host sheet can stand aside. */
  onOpen?: () => void;
}) {
  const noun = REPORT_TARGET_NOUN[targetType];
  const reportCopy = useClientCopy().trustVisible.report;
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
      {trigger === "row" ? (
        <button
          ref={openerRef}
          type="button"
          onClick={() => {
            onOpen?.();
            setOpen(true);
          }}
          data-testid="report-opener"
          className="nf-share-row mt-md w-full text-left"
        >
          <span className="h-11 w-11 shrink-0" aria-hidden="true">
            <BrandIcon name="shield-lock" fill />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block nf-body font-semibold text-[var(--nf-content-primary)]">
              Report this {noun}
            </span>
            <span className="block nf-caption text-[var(--nf-content-muted)]">
              A person reads every report. Nobody is told who sent it.
            </span>
          </span>
          <UiIcon name="chevron-right" size={16} className="shrink-0 text-[var(--nf-content-muted)]" />
        </button>
      ) : (
        <button
          ref={openerRef}
          type="button"
          onClick={() => {
            onOpen?.();
            setOpen(true);
          }}
          data-testid="report-opener"
          className="inline-flex items-center gap-2xs text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-muted)] underline underline-offset-4 transition-colors hover:text-[var(--nf-content-secondary)]"
        >
          <UiIcon name="bell" size={16} className="shrink-0" />
          Report this {noun}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Report">
          <button
            type="button"
            aria-label="Close report"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 bg-[var(--nf-overlay-backdrop)] backdrop-blur-sm"
          />
          <div
            ref={panelRef}
            data-testid="report-sheet"
            className="absolute inset-0 flex flex-col bg-[var(--nf-surface-primary)]"
          >
            <header className="nf-glass flex items-center gap-sm border-b border-[var(--nf-border-subtle)] px-md pb-sm pt-[calc(var(--nf-space-sm)+env(safe-area-inset-top,0px))]">
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
                <p className="text-[length:var(--nf-text-body-sm)] font-bold text-[var(--nf-content-primary)]">
                  Report this {noun}
                </p>
                <p className="truncate text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                  {targetLabel}
                </p>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-md py-md">
              <div className="mx-auto grid max-w-2xl gap-md pb-[calc(var(--nf-space-xl)+env(safe-area-inset-bottom,0px))]">
                {state?.ok ? (
                  <div className={panelClass({ variant: "card", className: "block p-lg text-center" })} data-testid="report-filed">
                    <span className="mx-auto block h-16 w-16">
                      <BrandIcon name="shield-check" fill />
                    </span>
                    <p className="mt-sm text-[length:var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
                      Thank you, we have it
                    </p>
                    {/* V-63: the promise for THIS category, from the one table the
                        standards page prints and the console counts down, not a
                        single day's promise for every kind of report. */}
                    <p className="mx-auto mt-xs max-w-[42ch] text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
                      {reportCopy.filed.replace("{clock}", responseTimeFor(category).phrase)}
                    </p>
                    <button type="button" onClick={close} className="nf-btn nf-btn--glass mt-md">
                      Back to the {noun}
                    </button>
                  </div>
                ) : !signedIn ? (
                  <div className={panelClass({ variant: "card", className: "block p-lg text-center" })}>
                    <span className="mx-auto block h-16 w-16">
                      <BrandIcon name="shield-lock" fill />
                    </span>
                    <p className="mt-sm text-[length:var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
                      Sign in to report this
                    </p>
                    <p className="mx-auto mt-xs max-w-[42ch] text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
                      A report belongs to somebody, which is what stops the queue filling
                      with noise and what lets us come back to you about it. The host is
                      never told who reported them.
                    </p>
                    <Link href="/sign-in" className="nf-btn nf-btn--primary mt-md">
                      Sign in
                    </Link>
                  </div>
                ) : (
                  <form action={formAction} noValidate className="grid gap-md">
                    <input type="hidden" name="targetType" value={targetType} />
                    <input type="hidden" name="targetId" value={targetId} />

                    <fieldset className={panelClass({ variant: "card", className: "block p-md" })}>
                      <legend className="px-2xs text-[length:var(--nf-text-body-sm)] font-bold text-[var(--nf-content-primary)]">
                        What happened?
                      </legend>
                      <div className="mt-xs grid gap-2xs">
                        {REPORT_CATEGORY_ORDER.map((code) => {
                          const copy = REPORT_CATEGORY_COPY[code];
                          const active = category === code;
                          return (
                            <label
                              key={code}
                              className={`flex cursor-pointer items-start gap-sm rounded-[var(--nf-radius-md)] border p-sm transition-colors ${
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
                                className="mt-2xs h-4 w-4 shrink-0 accent-[var(--nf-brand-primary)]"
                              />
                              <span className="min-w-0">
                                <span className="block text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                                  {copy.label}
                                </span>
                                <span className="mt-3xs block text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
                                  {copy.hint}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className={panelClass({ variant: "card", className: "block p-md" })}>
                      <label
                        htmlFor={`${uid}-details`}
                        className="text-[length:var(--nf-text-body-sm)] font-bold text-[var(--nf-content-primary)]"
                      >
                        Anything else we should know
                      </label>
                      <p className="mt-2xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
                        Optional, and it helps. Dates, amounts and account numbers are
                        exactly the detail that makes a report actionable.
                      </p>
                      <textarea
                        id={`${uid}-details`}
                        name="details"
                        rows={4}
                        maxLength={DETAILS_MAX}
                        className="nf-field mt-xs resize-y"
                        placeholder="He asked me to transfer to a personal account before any inspection."
                      />
                    </div>

                    {state && !state.ok && (
                      <p
                        role="alert"
                        className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] p-sm text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]"
                      >
                        {state.error}
                      </p>
                    )}

                    <div className="grid gap-xs">
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

                    {/* V-63: 112 as a number a frightened person can tap, not
                        "the emergency services" to look up. */}
                    <p className="text-center text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
                      {reportCopy.footer}{" "}
                      <a href="tel:112" className="font-semibold text-[var(--nf-content-primary)] underline underline-offset-2" data-testid="report-call-112">
                        {reportCopy.call}
                      </a>
                      .
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
