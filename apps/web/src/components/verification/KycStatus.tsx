import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * Where a submission stands, and what to do about it.
 *
 * Three states, and the third is the one every product gets wrong.
 *
 * PENDING says how long, because "under review" with no horizon is the reason
 * people write in. APPROVED says what changed, because being told "approved"
 * without being told that your listings can now publish leaves somebody
 * refreshing a dashboard.
 *
 * REJECTED ALWAYS CARRIES THE REASON AND THE FIX, and this component cannot
 * render a rejection without them: `reason` is required on that variant and
 * TypeScript refuses a call site that omits it. That is not defensive
 * programming, it is the product rule expressed where it cannot be forgotten.
 * A rejection without a reason is a locked door - the person has no idea
 * whether to re-photograph one page or give up - and it is exactly what the
 * existing agent verification page was built to stop happening over the phone.
 *
 * A server component. It is text, a pill and a link.
 */

export type KycStatusView =
  | { state: "pending"; submittedAt?: string }
  | { state: "approved" }
  | {
      state: "rejected";
      /** What the reviewer actually wrote. Shown in full, never softened. */
      reason: string;
      /** The one thing to do next. Required, for the same reason. */
      fix: string;
    };

export function KycStatus({ status, retryHref = "/verification" }: {
  status: KycStatusView;
  retryHref?: string;
}) {
  if (status.state === "pending") {
    return (
      <Panel
        tone="warning"
        pill={PENDING_PILL}
        icon="calendar-booking"
        title={PENDING_TITLE}
        body={PENDING_BODY}
      >
        {status.submittedAt && (
          <p className="mt-2 text-[0.8125rem] text-[var(--nf-content-muted)]">
            {SUBMITTED_PREFIX} {status.submittedAt}
          </p>
        )}
      </Panel>
    );
  }

  if (status.state === "approved") {
    return (
      <Panel
        tone="success"
        pill={APPROVED_PILL}
        icon="verified"
        title={APPROVED_TITLE}
        body={APPROVED_BODY}
      />
    );
  }

  return (
    <Panel
      tone="danger"
      pill={REJECTED_PILL}
      icon="shield-stop"
      title={REJECTED_TITLE}
      body={status.reason}
    >
      {/*
        The fix, given the same weight as the reason. A reader who has just been
        refused stops reading, so the sentence that tells them it is
        recoverable has to be immediately underneath and cannot be small print.
      */}
      <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        <span className="font-semibold text-[var(--nf-content-primary)]">{FIX_LABEL} </span>
        {status.fix}
      </p>
      <Link
        href={retryHref}
        className="mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
      >
        {RETRY}
        <UiIcon name="arrow-right" size="sm" />
      </Link>
    </Panel>
  );
}

function Panel({
  tone,
  pill,
  icon,
  title,
  body,
  children,
}: {
  tone: "warning" | "success" | "danger";
  pill: string;
  icon: "calendar-booking" | "verified" | "shield-stop";
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="nf-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="nf-role-mark" aria-hidden="true">
          <UiIcon name={icon} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
              {title}
            </h2>
            <StatusPill tone={tone}>{pill}</StatusPill>
          </div>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {body}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}

const PENDING_PILL = "In review";
const PENDING_TITLE = "We are checking your documents";
const PENDING_BODY =
  "A person reads every submission by hand. Most decisions come back within one working day, and we email you either way. You can keep drafting listings while you wait.";
const SUBMITTED_PREFIX = "Sent";
const APPROVED_PILL = "Verified";
const APPROVED_TITLE = "You are verified";
const APPROVED_BODY =
  "Your listings can go live, and the verified mark now shows on your profile and beside your name in every conversation.";
const REJECTED_PILL = "Not approved";
const REJECTED_TITLE = "We could not verify this";
const FIX_LABEL = "What to do:";
const RETRY = "Send it again";
