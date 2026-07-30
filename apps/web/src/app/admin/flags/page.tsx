import type { Metadata } from "next";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getMessageFlags, type FlagView, type PartyRole } from "@/lib/admin/queries";
import { FlagDecision } from "../_components/AdminActions";
import { QueueEmpty, QueueHeader, QueueUnavailable, StatusChip, formatWhen } from "../_components/ui";

export const metadata: Metadata = { title: "Message flags", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const REASON_LABEL: Record<FlagView["reason"], string> = {
  account_number: "Account number",
  payment_keyword: "Payment talk",
};

const ROLE_LABEL: Record<PartyRole, string> = {
  guest: "Guest",
  agent: "Agent",
  unknown: "Participant",
};

/**
 * The flag queue: the only place the safety scanner is visible.
 *
 * The trigger in the database files a flag on every message carrying a ten
 * digit run or payment talk, and nothing in the app ever tells the sender. Here
 * a reviewer sees the matched fragment, the run-up to it in the conversation,
 * and takes one of two real decisions: clear it, or raise a risk alert that
 * keeps the case open on another queue.
 */
function Fragment({ text }: { text: string }) {
  return (
    <code
      className="nf-numeric rounded-[var(--nf-radius-xs)] px-1.5 py-0.5 text-[0.8125rem] font-semibold"
      style={{ background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" }}
    >
      {text}
    </code>
  );
}

function FlagCard({ flag }: { flag: FlagView }) {
  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={flag.status} />
        <StatusChip label={REASON_LABEL[flag.reason]} tone="info" />
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          {formatWhen(flag.createdAt)}
        </span>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-2 text-[0.8125rem] text-[var(--nf-content-secondary)]">
        <UiIcon name="search" size={14} className="shrink-0" />
        The scan matched <Fragment text={flag.matched} /> in a message from the{" "}
        {ROLE_LABEL[flag.senderRole].toLowerCase()}.
      </p>

      <div className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] p-3">
        <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-content-muted)]">
          Conversation context
        </p>
        <ul className="mt-2 space-y-2">
          {flag.context.length === 0 && (
            <li className="text-[0.8125rem] text-[var(--nf-content-secondary)]">{flag.body}</li>
          )}
          {flag.context.map((line) => (
            <li
              key={line.id}
              className="rounded-[var(--nf-radius-sm)] p-2"
              style={
                line.flagged
                  ? {
                      background: "var(--nf-state-warning-surface)",
                      border: "1px solid color-mix(in oklab, var(--nf-state-warning) 40%, transparent)",
                    }
                  : { background: "color-mix(in oklab, var(--nf-content-primary) 5%, transparent)" }
              }
            >
              <span className="flex items-center gap-2">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-content-muted)]">
                  {ROLE_LABEL[line.role]}
                </span>
                <span className="text-[0.6875rem] text-[var(--nf-content-muted)]">
                  {formatWhen(line.createdAt)}
                </span>
                {line.flagged && (
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-state-warning)]">
                    Flagged
                  </span>
                )}
              </span>
              <p className="mt-1 whitespace-pre-wrap break-words text-[0.8125rem] leading-relaxed text-[var(--nf-content-primary)]">
                {line.body}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {flag.status === "open" ? (
        <FlagDecision flagId={flag.id} />
      ) : (
        <p className="mt-3 text-[0.75rem] text-[var(--nf-content-muted)]">
          Reviewed. The decision is in the audit log.
        </p>
      )}
    </li>
  );
}

export default async function AdminFlagsPage() {
  const flags = await getMessageFlags();

  if (flags.state !== "ok") {
    return (
      <div className="mx-auto max-w-3xl">
        <QueueHeader
          title="Message flags"
          lede="Messages the safety scan caught carrying an account number or payment talk."
        />
        <QueueUnavailable />
      </div>
    );
  }

  const open = flags.data.filter((flag) => flag.status === "open");
  const reviewed = flags.data.filter((flag) => flag.status !== "open");

  return (
    <div className="mx-auto max-w-3xl">
      <QueueHeader
        title="Message flags"
        lede="A database trigger scans every message for a ten digit account number and for payment talk, then files what it finds here. The sender is never told, so this queue is the only place the scanner shows its work."
        count={open.length}
      />

      {open.length === 0 ? (
        <QueueEmpty
          title="No flags waiting"
          body="Every flagged message has been reviewed. New ones appear here the moment the scan files them."
        />
      ) : (
        <ul className="space-y-3">
          {open.map((flag) => (
            <FlagCard key={flag.id} flag={flag} />
          ))}
        </ul>
      )}

      {reviewed.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">Recently reviewed</h2>
          <ul className="space-y-3">
            {reviewed.map((flag) => (
              <FlagCard key={flag.id} flag={flag} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
