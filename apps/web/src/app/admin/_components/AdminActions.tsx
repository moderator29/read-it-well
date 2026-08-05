"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Chip, ChipRow } from "@/components/ui/Chip";
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
 * The sheet mechanics — portal, drag handle, detents, focus trap, focus
 * restoration, Escape, backdrop and body scroll lock — belong to `<Sheet>`.
 * What stays here is the decision: the required note, the refusal, the
 * in-sheet success state.
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
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const outcome = await run(notes.trim());
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  };

  const blocked = notesRequired && notes.trim().length === 0;

  const succeeded = Boolean(result?.ok);

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      /* The success state replaces the heading with its own line, exactly as
         before; the title stays as the sheet's accessible name. */
      hideTitle={succeeded}
      footer={
        succeeded ? (
          <Button variant="primary" full onClick={onClose}>
            {common.done}
          </Button>
        ) : (
          <div className="grid gap-3">
            <Button
              variant={destructive ? "dangerQuiet" : "primary"}
              full
              onClick={submit}
              disabled={blocked}
              loading={pending}
            >
              {confirmLabel}
            </Button>
            <Button variant="secondary" full onClick={onClose}>
              {common.notNow}
            </Button>
          </div>
        )
      }
    >
      {succeeded ? (
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
            <UiIcon name="verified" size={20} className="text-[var(--nf-state-success)]" />
            {successTitle}
          </p>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {successBody}
          </p>
        </div>
      ) : (
        <>
          <p className="text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
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
        </>
      )}
    </Sheet>
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
        <Button variant="primary" onClick={() => setSheet("cleared")}>
          {copy.clear}
        </Button>
        <Button variant="secondary" onClick={() => setSheet("escalated")}>
          {copy.escalate}
        </Button>
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
        <Button variant="primary" onClick={() => setOpen(true)}>
          {copy.resolve}
        </Button>
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
          <Button variant="secondary" onClick={() => setSheet("reviewing")}>
            {copy.startReview}
          </Button>
        )}
        <Button variant="primary" onClick={() => setSheet("resolved")}>
          {copy.resolve}
        </Button>
        <Button variant="secondary" onClick={() => setSheet("dismissed")}>
          {copy.dismiss}
        </Button>
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
        <Button variant="primary" onClick={() => setSheet("approve")}>
          {copy.approve}
        </Button>
        <Button variant="secondary" onClick={() => setSheet("request_changes")}>
          {copy.requestChanges}
        </Button>
        <Button variant="dangerQuiet" onClick={() => setSheet("reject")}>
          {copy.reject}
        </Button>
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
          <Button variant="primary" onClick={() => setSheet("publish")}>
            {copy.publish}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setSheet("approve")}>
            {copy.approve}
          </Button>
        )}
        <Button variant="secondary" onClick={() => setSheet("request_changes")}>
          {copy.requestChanges}
        </Button>
        <Button variant="dangerQuiet" onClick={() => setSheet("reject")}>
          {copy.reject}
        </Button>
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
        <Button
          variant="primary"
          onClick={send}
          disabled={body.trim().length < 2}
          loading={pending}
        >
          {copy.reply.send}
        </Button>
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
      {/* The shared rail. The current state stays disabled - moving a ticket to
          where it already is is not a move - and selection is now a ring and a
          fill rather than a hairline glow, which is the difference between an
          operator seeing the current state and guessing at it. */}
      <ChipRow bleed={false} fadeEdges={false} className="mt-1.5">
        {TICKET_STATES.map((state) => (
          <Chip
            key={state}
            size="sm"
            disabled={pending || state === status}
            selected={state === status}
            onSelectedChange={() => move(state)}
          >
            {copy.states[state]}
          </Chip>
        ))}
      </ChipRow>
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
        <Button variant="dangerQuiet" onClick={() => setConfirming(true)} className="shrink-0">
          {copy.switchOff}
        </Button>
      ) : (
        <Button variant="primary" onClick={turnOn} loading={pending} className="shrink-0">
          {copy.switchOn}
        </Button>
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
