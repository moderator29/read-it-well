"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ActionResult } from "@/lib/actions/envelope";
import { fill, type AdminCommon, type AdminCopy } from "./copy";
import {
  replySupportTicket,
  resolveReport,
  resolveRiskAlert,
  reviewAgentApplication,
  reviewListing,
  reviewMessageFlag,
  setTicketStatus,
  toggleFeatureFlag,
} from "@/lib/admin/actions";

/**
 * Every hand the console offers, in one client module.
 *
 * They all share one confirm sheet, so a decision always looks and behaves the
 * same wherever it is taken: state what is about to happen, take the reviewer's
 * note, run the server action, then either show the plain-language refusal the
 * envelope carried or refresh the page so the queue re-renders from the
 * database rather than from optimistic guesswork.
 *
 * Every string arrives as a dictionary slice from the queue page that renders
 * the control: these are client components, so none of them resolves a locale
 * or reads a dictionary itself.
 */

type Runner = (notes: string) => Promise<ActionResult<null>>;

type SheetProps = {
  common: AdminCommon;
  title: string;
  description: string;
  confirmLabel: string;
  successTitle: string;
  successBody: string;
  run: Runner;
  onClose: () => void;
  withNotes?: boolean;
  notesLabel?: string;
  notesRequired?: boolean;
  destructive?: boolean;
};

function ActionSheet({
  common,
  title,
  description,
  confirmLabel,
  successTitle,
  successBody,
  run,
  onClose,
  withNotes = false,
  notesLabel,
  notesRequired = false,
  destructive = false,
}: SheetProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Escape, the Tab trap, the counted scroll lock and the focus return all
     come from the one shared implementation. This sheet used to hand-roll the
     first two of the four and trap nothing. */
  useOverlay({ open: true, onClose, panelRef, autoFocus: false });

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  if (!mounted) return null;

  const submit = () => {
    startTransition(async () => {
      const outcome = await run(notes.trim());
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  };

  const blocked = notesRequired && notes.trim().length === 0;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={common.close}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="nf-rise relative max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] p-5 shadow-[var(--nf-shadow-float)] outline-none sm:max-w-md sm:rounded-3xl"
      >
        {result?.ok ? (
          <div className="text-center">
            <p className="flex items-center justify-center gap-2 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
              <UiIcon name="verified" size={20} className="text-[var(--nf-state-success)]" />
              {successTitle}
            </p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {successBody}
            </p>
            <button type="button" onClick={onClose} className="nf-btn nf-btn--primary mt-4 w-full">
              {common.done}
            </button>
          </div>
        ) : (
          <>
            <h2 className="nf-h3">{title}</h2>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {description}
            </p>

            {withNotes && (
              <label className="mt-4 block">
                <span className="nf-label">
                  {notesLabel}
                  {notesRequired ? "" : ` ${common.optional}`}
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="nf-field mt-1 w-full resize-y"
                  placeholder={common.notePlaceholder}
                />
              </label>
            )}

            {result && !result.ok && (
              <p
                role="alert"
                className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
              >
                {result.error}
              </p>
            )}

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={pending || blocked}
                className="nf-btn nf-btn--primary w-full disabled:opacity-60"
                style={
                  destructive
                    ? { background: "var(--nf-state-error)", boxShadow: "none" }
                    : undefined
                }
              >
                {pending ? common.working : confirmLabel}
              </button>
              <button type="button" onClick={onClose} className="nf-btn nf-btn--glass w-full">
                {common.notNow}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-2">{children}</div>;
}

/** ------------------------------------------------------------ message flags */

export function FlagDecision({
  flagId,
  copy,
  common,
}: {
  flagId: string;
  copy: AdminCopy["flags"];
  common: AdminCommon;
}) {
  const [sheet, setSheet] = useState<null | "cleared" | "escalated">(null);

  return (
    <>
      <Row>
        <button type="button" onClick={() => setSheet("cleared")} className="nf-btn nf-btn--primary">
          {copy.clear}
        </button>
        <button type="button" onClick={() => setSheet("escalated")} className="nf-btn nf-btn--glass">
          {copy.escalate}
        </button>
      </Row>

      {sheet === "cleared" && (
        <ActionSheet
          common={common}
          title={copy.clearSheet.title}
          description={copy.clearSheet.body}
          confirmLabel={copy.clearSheet.confirm}
          successTitle={copy.clearSheet.successTitle}
          successBody={copy.clearSheet.successBody}
          run={() => reviewMessageFlag({ flagId, resolution: "cleared" })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "escalated" && (
        <ActionSheet
          common={common}
          title={copy.escalateSheet.title}
          description={copy.escalateSheet.body}
          confirmLabel={copy.escalateSheet.confirm}
          successTitle={copy.escalateSheet.successTitle}
          successBody={copy.escalateSheet.successBody}
          run={() => reviewMessageFlag({ flagId, resolution: "escalated" })}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

/** -------------------------------------------------------------- risk alerts */

export function AlertResolve({
  alertId,
  copy,
  common,
}: {
  alertId: string;
  copy: AdminCopy["alerts"];
  common: AdminCommon;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Row>
        <button type="button" onClick={() => setOpen(true)} className="nf-btn nf-btn--primary">
          {copy.resolve}
        </button>
      </Row>

      {open && (
        <ActionSheet
          common={common}
          title={copy.sheet.title}
          description={copy.sheet.body}
          confirmLabel={copy.sheet.confirm}
          successTitle={copy.sheet.successTitle}
          successBody={copy.sheet.successBody}
          withNotes
          notesLabel={copy.sheet.notesLabel}
          run={(notes) => resolveRiskAlert({ alertId, notes })}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** ------------------------------------------------------------------ reports */

export function ReportDecision({
  reportId,
  status,
  copy,
  common,
}: {
  reportId: string;
  status: string;
  copy: AdminCopy["reports"];
  common: AdminCommon;
}) {
  const [sheet, setSheet] = useState<null | "reviewing" | "resolved" | "dismissed">(null);

  return (
    <>
      <Row>
        {status === "open" && (
          <button
            type="button"
            onClick={() => setSheet("reviewing")}
            className="nf-btn nf-btn--glass"
          >
            {copy.startReview}
          </button>
        )}
        <button type="button" onClick={() => setSheet("resolved")} className="nf-btn nf-btn--primary">
          {copy.resolve}
        </button>
        <button type="button" onClick={() => setSheet("dismissed")} className="nf-btn nf-btn--glass">
          {copy.dismiss}
        </button>
      </Row>

      {sheet === "reviewing" && (
        <ActionSheet
          common={common}
          title={copy.reviewSheet.title}
          description={copy.reviewSheet.body}
          confirmLabel={copy.reviewSheet.confirm}
          successTitle={copy.reviewSheet.successTitle}
          successBody={copy.reviewSheet.successBody}
          withNotes
          notesLabel={copy.reviewSheet.notesLabel}
          run={(notes) => resolveReport({ reportId, decision: "reviewing", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "resolved" && (
        <ActionSheet
          common={common}
          title={copy.resolveSheet.title}
          description={copy.resolveSheet.body}
          confirmLabel={copy.resolveSheet.confirm}
          successTitle={copy.resolveSheet.successTitle}
          successBody={copy.resolveSheet.successBody}
          withNotes
          notesLabel={copy.resolveSheet.notesLabel}
          run={(notes) => resolveReport({ reportId, decision: "resolved", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "dismissed" && (
        <ActionSheet
          common={common}
          title={copy.dismissSheet.title}
          description={copy.dismissSheet.body}
          confirmLabel={copy.dismissSheet.confirm}
          successTitle={copy.dismissSheet.successTitle}
          successBody={copy.dismissSheet.successBody}
          withNotes
          notesLabel={copy.dismissSheet.notesLabel}
          run={(notes) => resolveReport({ reportId, decision: "dismissed", notes })}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

/** ------------------------------------------------------- agent applications */

export function ApplicationDecision({
  applicationId,
  applicantName,
  copy,
  common,
}: {
  applicationId: string;
  applicantName: string;
  copy: AdminCopy["applications"];
  common: AdminCommon;
}) {
  const [sheet, setSheet] = useState<null | "approve" | "request_changes" | "reject">(null);

  return (
    <>
      <Row>
        <button type="button" onClick={() => setSheet("approve")} className="nf-btn nf-btn--primary">
          {copy.approve}
        </button>
        <button
          type="button"
          onClick={() => setSheet("request_changes")}
          className="nf-btn nf-btn--glass"
        >
          {copy.requestChanges}
        </button>
        <button
          type="button"
          onClick={() => setSheet("reject")}
          className="nf-btn nf-btn--glass"
          style={{ color: "var(--nf-state-error)" }}
        >
          {copy.reject}
        </button>
      </Row>

      {sheet === "approve" && (
        <ActionSheet
          common={common}
          title={fill(copy.approveSheet.title, { name: applicantName })}
          description={copy.approveSheet.body}
          confirmLabel={copy.approveSheet.confirm}
          successTitle={copy.approveSheet.successTitle}
          successBody={copy.approveSheet.successBody}
          withNotes
          notesLabel={copy.approveSheet.notesLabel}
          run={(notes) => reviewAgentApplication({ applicationId, decision: "approve", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "request_changes" && (
        <ActionSheet
          common={common}
          title={copy.changesSheet.title}
          description={copy.changesSheet.body}
          confirmLabel={copy.changesSheet.confirm}
          successTitle={copy.changesSheet.successTitle}
          successBody={copy.changesSheet.successBody}
          withNotes
          notesRequired
          notesLabel={copy.changesSheet.notesLabel}
          run={(notes) =>
            reviewAgentApplication({ applicationId, decision: "request_changes", notes })
          }
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "reject" && (
        <ActionSheet
          common={common}
          title={fill(copy.rejectSheet.title, { name: applicantName })}
          description={copy.rejectSheet.body}
          confirmLabel={copy.rejectSheet.confirm}
          successTitle={copy.rejectSheet.successTitle}
          successBody={copy.rejectSheet.successBody}
          withNotes
          notesLabel={copy.rejectSheet.notesLabel}
          destructive
          run={(notes) => reviewAgentApplication({ applicationId, decision: "reject", notes })}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

/** ----------------------------------------------------------------- listings */

export function ListingDecision({
  listingId,
  status,
  title,
  copy,
  common,
}: {
  listingId: string;
  status: string;
  title: string;
  copy: AdminCopy["listings"];
  common: AdminCommon;
}) {
  const [sheet, setSheet] = useState<null | "approve" | "publish" | "request_changes" | "reject">(
    null,
  );

  return (
    <>
      <Row>
        {status === "APPROVED" ? (
          <button type="button" onClick={() => setSheet("publish")} className="nf-btn nf-btn--primary">
            {copy.publish}
          </button>
        ) : (
          <button type="button" onClick={() => setSheet("approve")} className="nf-btn nf-btn--primary">
            {copy.approve}
          </button>
        )}
        <button
          type="button"
          onClick={() => setSheet("request_changes")}
          className="nf-btn nf-btn--glass"
        >
          {copy.requestChanges}
        </button>
        <button
          type="button"
          onClick={() => setSheet("reject")}
          className="nf-btn nf-btn--glass"
          style={{ color: "var(--nf-state-error)" }}
        >
          {copy.reject}
        </button>
      </Row>

      {sheet === "approve" && (
        <ActionSheet
          common={common}
          title={fill(copy.approveSheet.title, { title })}
          description={copy.approveSheet.body}
          confirmLabel={copy.approveSheet.confirm}
          successTitle={copy.approveSheet.successTitle}
          successBody={copy.approveSheet.successBody}
          withNotes
          notesLabel={copy.approveSheet.notesLabel}
          run={(notes) => reviewListing({ listingId, decision: "approve", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "publish" && (
        <ActionSheet
          common={common}
          title={fill(copy.publishSheet.title, { title })}
          description={copy.publishSheet.body}
          confirmLabel={copy.publishSheet.confirm}
          successTitle={copy.publishSheet.successTitle}
          successBody={copy.publishSheet.successBody}
          withNotes
          notesLabel={copy.publishSheet.notesLabel}
          run={(notes) => reviewListing({ listingId, decision: "publish", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "request_changes" && (
        <ActionSheet
          common={common}
          title={copy.changesSheet.title}
          description={copy.changesSheet.body}
          confirmLabel={copy.changesSheet.confirm}
          successTitle={copy.changesSheet.successTitle}
          successBody={copy.changesSheet.successBody}
          withNotes
          notesRequired
          notesLabel={copy.changesSheet.notesLabel}
          run={(notes) => reviewListing({ listingId, decision: "request_changes", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "reject" && (
        <ActionSheet
          common={common}
          title={fill(copy.rejectSheet.title, { title })}
          description={copy.rejectSheet.body}
          confirmLabel={copy.rejectSheet.confirm}
          successTitle={copy.rejectSheet.successTitle}
          successBody={copy.rejectSheet.successBody}
          withNotes
          notesLabel={copy.rejectSheet.notesLabel}
          destructive
          run={(notes) => reviewListing({ listingId, decision: "reject", notes })}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

/** ---------------------------------------------------------- support tickets */

export function TicketReply({
  ticketId,
  copy,
}: {
  ticketId: string;
  copy: AdminCopy["support"];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();

  const send = () => {
    startTransition(async () => {
      const outcome = await replySupportTicket({ ticketId, body });
      setResult(outcome);
      if (outcome.ok) {
        setBody("");
        router.refresh();
      }
    });
  };

  return (
    <div className="mt-4">
      <label className="block">
        <span className="nf-label">{copy.reply.label}</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          maxLength={4000}
          className="nf-field mt-1 w-full resize-y"
          placeholder={copy.reply.placeholder}
        />
      </label>

      {result && !result.ok && (
        <p
          role="alert"
          className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
        >
          {result.error}
        </p>
      )}
      {result?.ok && (
        <p className="mt-2 text-[0.8125rem] text-[var(--nf-state-success)]">{copy.reply.sent}</p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={send}
          disabled={pending || body.trim().length < 2}
          className="nf-btn nf-btn--primary disabled:opacity-60"
        >
          {pending ? copy.reply.sending : copy.reply.send}
        </button>
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">{copy.reply.note}</span>
      </div>
    </div>
  );
}

const TICKET_STATES = ["open", "pending", "resolved", "closed"] as const;

export function TicketStatusControl({
  ticketId,
  status,
  copy,
}: {
  ticketId: string;
  status: string;
  copy: AdminCopy["support"];
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();

  const move = (next: (typeof TICKET_STATES)[number]) => {
    startTransition(async () => {
      const outcome = await setTicketStatus({ ticketId, status: next });
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  };

  return (
    <div className="mt-4">
      <span className="nf-label">{copy.stateLabel}</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {TICKET_STATES.map((state) => (
          <button
            key={state}
            type="button"
            disabled={pending || state === status}
            onClick={() => move(state)}
            aria-pressed={state === status}
            className={`nf-chip ${state === status ? "nf-chip--active" : ""} disabled:opacity-70`}
          >
            {copy.states[state]}
          </button>
        ))}
      </div>
      {result && !result.ok && (
        <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--nf-state-warning)]">
          {result.error}
        </p>
      )}
    </div>
  );
}

/** ------------------------------------------------------------ kill switches */

export function SwitchControl({
  flagKey,
  label,
  enabled,
  copy,
  common,
}: {
  flagKey: string;
  label: string;
  enabled: boolean;
  copy: AdminCopy["switches"];
  common: AdminCommon;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();

  const turnOn = () => {
    startTransition(async () => {
      const outcome = await toggleFeatureFlag({ key: flagKey, enabled: true });
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  };

  return (
    <>
      {enabled ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="nf-btn nf-btn--glass shrink-0"
          style={{ color: "var(--nf-state-error)" }}
        >
          {copy.switchOff}
        </button>
      ) : (
        <button
          type="button"
          onClick={turnOn}
          disabled={pending}
          className="nf-btn nf-btn--primary shrink-0 disabled:opacity-60"
        >
          {pending ? common.working : copy.switchOn}
        </button>
      )}

      {result && !result.ok && (
        <p role="alert" className="mt-2 w-full text-[0.8125rem] text-[var(--nf-state-warning)]">
          {result.error}
        </p>
      )}

      {confirming && (
        <ActionSheet
          common={common}
          title={fill(copy.sheet.title, { label })}
          description={copy.sheet.body}
          confirmLabel={copy.sheet.confirm}
          successTitle={copy.sheet.successTitle}
          successBody={copy.sheet.successBody}
          destructive
          run={() => toggleFeatureFlag({ key: flagKey, enabled: false })}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
