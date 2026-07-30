"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ActionResult } from "@/lib/actions/envelope";
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
 */

type Runner = (notes: string) => Promise<ActionResult<null>>;

type SheetProps = {
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
  title,
  description,
  confirmLabel,
  successTitle,
  successBody,
  run,
  onClose,
  withNotes = false,
  notesLabel = "Note to the applicant",
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

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
        aria-label="Close"
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
              Done
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
                  {notesRequired ? "" : " (optional)"}
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="nf-field mt-1 w-full resize-y"
                  placeholder="They will read this word for word, so keep it specific and kind."
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

            <div className="mt-4 grid gap-2.5">
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
                {pending ? "Working..." : confirmLabel}
              </button>
              <button type="button" onClick={onClose} className="nf-btn nf-btn--glass w-full">
                Not now
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

export function FlagDecision({ flagId }: { flagId: string }) {
  const [sheet, setSheet] = useState<null | "cleared" | "escalated">(null);

  return (
    <>
      <Row>
        <button type="button" onClick={() => setSheet("cleared")} className="nf-btn nf-btn--primary">
          Clear this flag
        </button>
        <button type="button" onClick={() => setSheet("escalated")} className="nf-btn nf-btn--glass">
          Raise a risk alert
        </button>
      </Row>

      {sheet === "cleared" && (
        <ActionSheet
          title="Clear this flag?"
          description="The scan was right to look, but this conversation is fine. The flag closes and the reviewed decision is written to the audit log with your name against it. Nobody in the conversation is told."
          confirmLabel="Yes, clear it"
          successTitle="Flag cleared"
          successBody="The queue has been updated and the audit log carries your decision."
          run={() => reviewMessageFlag({ flagId, resolution: "cleared" })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "escalated" && (
        <ActionSheet
          title="Raise a risk alert?"
          description="This closes the flag and opens a high severity risk alert against the message, so the case stays on the alerts queue until someone works it. Nobody in the conversation is told."
          confirmLabel="Close the flag and raise an alert"
          successTitle="Alert raised"
          successBody="The flag is reviewed and a high severity alert is now open on the alerts queue."
          run={() => reviewMessageFlag({ flagId, resolution: "escalated" })}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

/** -------------------------------------------------------------- risk alerts */

export function AlertResolve({ alertId }: { alertId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Row>
        <button type="button" onClick={() => setOpen(true)} className="nf-btn nf-btn--primary">
          Mark resolved
        </button>
      </Row>

      {open && (
        <ActionSheet
          title="Resolve this alert?"
          description="Use this once the case has actually been worked. The alert closes with a timestamp and your note goes into the audit log."
          confirmLabel="Yes, resolve it"
          successTitle="Alert resolved"
          successBody="The alert is closed and the audit log carries your note."
          withNotes
          notesLabel="What was done"
          run={(notes) => resolveRiskAlert({ alertId, notes })}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** ------------------------------------------------------------------ reports */

export function ReportDecision({ reportId, status }: { reportId: string; status: string }) {
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
            Start reviewing
          </button>
        )}
        <button type="button" onClick={() => setSheet("resolved")} className="nf-btn nf-btn--primary">
          Resolve
        </button>
        <button type="button" onClick={() => setSheet("dismissed")} className="nf-btn nf-btn--glass">
          Dismiss
        </button>
      </Row>

      {sheet === "reviewing" && (
        <ActionSheet
          title="Take this report on?"
          description="It moves to in review so the rest of the team can see somebody has it."
          confirmLabel="Yes, I am on it"
          successTitle="Report picked up"
          successBody="The report now shows as in review."
          withNotes
          notesLabel="Note for the audit log"
          run={(notes) => resolveReport({ reportId, decision: "reviewing", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "resolved" && (
        <ActionSheet
          title="Resolve this report?"
          description="Use this when action has been taken on the reported content or account. The report closes with a timestamp."
          confirmLabel="Yes, resolve it"
          successTitle="Report resolved"
          successBody="The report is closed and your note is in the audit log."
          withNotes
          notesLabel="What was done"
          run={(notes) => resolveReport({ reportId, decision: "resolved", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "dismissed" && (
        <ActionSheet
          title="Dismiss this report?"
          description="Use this when there is nothing to act on. The report closes and no action is taken against the reported party."
          confirmLabel="Yes, dismiss it"
          successTitle="Report dismissed"
          successBody="The report is closed and your note is in the audit log."
          withNotes
          notesLabel="Why it was dismissed"
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
}: {
  applicationId: string;
  applicantName: string;
}) {
  const [sheet, setSheet] = useState<null | "approve" | "request_changes" | "reject">(null);

  return (
    <>
      <Row>
        <button type="button" onClick={() => setSheet("approve")} className="nf-btn nf-btn--primary">
          Approve
        </button>
        <button
          type="button"
          onClick={() => setSheet("request_changes")}
          className="nf-btn nf-btn--glass"
        >
          Request changes
        </button>
        <button
          type="button"
          onClick={() => setSheet("reject")}
          className="nf-btn nf-btn--glass"
          style={{ color: "var(--nf-state-error)" }}
        >
          Reject
        </button>
      </Row>

      {sheet === "approve" && (
        <ActionSheet
          title={`Approve ${applicantName}?`}
          description="This creates their agent profile, grants the agent role so Agent Mode opens for them, and tells them on the platform. It is written to the audit log with your name against it."
          confirmLabel="Yes, approve"
          successTitle="Application approved"
          successBody="Their agent profile is live, the role is granted and they have been notified."
          withNotes
          notesLabel="Note to the applicant"
          run={(notes) => reviewAgentApplication({ applicationId, decision: "approve", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "request_changes" && (
        <ActionSheet
          title="Ask for more information?"
          description="The application moves to changes requested and the applicant is told what you need. They can edit and resubmit."
          confirmLabel="Send it back"
          successTitle="Sent back to the applicant"
          successBody="They have been notified and can update their application."
          withNotes
          notesRequired
          notesLabel="What the applicant must change"
          run={(notes) =>
            reviewAgentApplication({ applicationId, decision: "request_changes", notes })
          }
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "reject" && (
        <ActionSheet
          title={`Reject ${applicantName}?`}
          description="The application closes as not approved and the applicant is told. Say why: it is the only explanation they will get."
          confirmLabel="Yes, reject"
          successTitle="Application rejected"
          successBody="The applicant has been notified and the decision is in the audit log."
          withNotes
          notesLabel="Reason for the applicant"
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
}: {
  listingId: string;
  status: string;
  title: string;
}) {
  const [sheet, setSheet] = useState<null | "approve" | "publish" | "request_changes" | "reject">(
    null,
  );

  return (
    <>
      <Row>
        {status === "APPROVED" ? (
          <button type="button" onClick={() => setSheet("publish")} className="nf-btn nf-btn--primary">
            Publish
          </button>
        ) : (
          <button type="button" onClick={() => setSheet("approve")} className="nf-btn nf-btn--primary">
            Approve
          </button>
        )}
        <button
          type="button"
          onClick={() => setSheet("request_changes")}
          className="nf-btn nf-btn--glass"
        >
          Request changes
        </button>
        <button
          type="button"
          onClick={() => setSheet("reject")}
          className="nf-btn nf-btn--glass"
          style={{ color: "var(--nf-state-error)" }}
        >
          Reject
        </button>
      </Row>

      {sheet === "approve" && (
        <ActionSheet
          title={`Approve ${title}?`}
          description="Approving says the submission passes review. It does not put the listing in front of guests yet: publish is the separate second step, so nothing goes live by accident."
          confirmLabel="Yes, approve"
          successTitle="Listing approved"
          successBody="The agent has been told. Publish it when you are ready for guests to see it."
          withNotes
          notesLabel="Note to the agent"
          run={(notes) => reviewListing({ listingId, decision: "approve", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "publish" && (
        <ActionSheet
          title={`Publish ${title}?`}
          description="This puts the listing into public search immediately, where anyone can find and book it. The agent is told it is live."
          confirmLabel="Yes, publish it"
          successTitle="Listing is live"
          successBody="It is now in search and the agent has been notified."
          withNotes
          notesLabel="Note to the agent"
          run={(notes) => reviewListing({ listingId, decision: "publish", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "request_changes" && (
        <ActionSheet
          title="Ask the agent for changes?"
          description="The listing moves to changes requested and the agent is told exactly what to fix. Point at the checklist line that failed."
          confirmLabel="Send it back"
          successTitle="Sent back to the agent"
          successBody="They have been notified and can update the listing."
          withNotes
          notesRequired
          notesLabel="What the agent must change"
          run={(notes) => reviewListing({ listingId, decision: "request_changes", notes })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "reject" && (
        <ActionSheet
          title={`Reject ${title}?`}
          description="The listing closes as not approved and cannot be booked. The agent is told, so say why."
          confirmLabel="Yes, reject"
          successTitle="Listing rejected"
          successBody="The agent has been notified and the decision is in the audit log."
          withNotes
          notesLabel="Reason for the agent"
          destructive
          run={(notes) => reviewListing({ listingId, decision: "reject", notes })}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

/** ---------------------------------------------------------- support tickets */

export function TicketReply({ ticketId }: { ticketId: string }) {
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
        <span className="nf-label">Reply to this person</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          maxLength={4000}
          className="nf-field mt-1 w-full resize-y"
          placeholder="Answer plainly and say what happens next."
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
        <p className="mt-2 text-[0.8125rem] text-[var(--nf-state-success)]">
          Reply sent. They have been notified on the platform.
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={pending || body.trim().length < 2}
          className="nf-btn nf-btn--primary disabled:opacity-60"
        >
          {pending ? "Sending..." : "Send reply"}
        </button>
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          Sending notifies the ticket owner on the platform.
        </span>
      </div>
    </div>
  );
}

const TICKET_STATES: { value: "open" | "pending" | "resolved" | "closed"; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Awaiting reply" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function TicketStatusControl({
  ticketId,
  status,
}: {
  ticketId: string;
  status: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();

  const move = (next: "open" | "pending" | "resolved" | "closed") => {
    startTransition(async () => {
      const outcome = await setTicketStatus({ ticketId, status: next });
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  };

  return (
    <div className="mt-4">
      <span className="nf-label">Ticket state</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {TICKET_STATES.map((state) => (
          <button
            key={state.value}
            type="button"
            disabled={pending || state.value === status}
            onClick={() => move(state.value)}
            aria-pressed={state.value === status}
            className={`nf-chip ${state.value === status ? "nf-chip--active" : ""} disabled:opacity-70`}
          >
            {state.label}
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
}: {
  flagKey: string;
  label: string;
  enabled: boolean;
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
          Switch off
        </button>
      ) : (
        <button
          type="button"
          onClick={turnOn}
          disabled={pending}
          className="nf-btn nf-btn--primary shrink-0 disabled:opacity-60"
        >
          {pending ? "Working..." : "Switch on"}
        </button>
      )}

      {result && !result.ok && (
        <p role="alert" className="mt-2 w-full text-[0.8125rem] text-[var(--nf-state-warning)]">
          {result.error}
        </p>
      )}

      {confirming && (
        <ActionSheet
          title={`Switch off ${label}?`}
          description="Everyone loses this part of RentMe straight away, including people in the middle of using it. Nothing already saved is deleted, and switching it back on restores the surface. The change reaches every page within about thirty seconds."
          confirmLabel="Yes, switch it off"
          successTitle="Switched off"
          successBody="The surface is off for everyone and the change is in the audit log."
          destructive
          run={() => toggleFeatureFlag({ key: flagKey, enabled: false })}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
