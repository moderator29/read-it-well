import Link from "next/link";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { StatusPill } from "@/components/ui/StatusPill";
import { KYC_STATUS_WORDS } from "@/components/app/untranslated";

/**
 * Where a submission stands, and what to do about it.
 *
 * Five states. It had three, and the two that were missing were the two where
 * the applicant is the one who has to act.
 *
 * ---------------------------------------------------------------------------
 * THE ONE STATE THAT NEEDS THE APPLICANT HAD NO SCREEN.
 *
 * `agent_application_status` carries MORE_INFO_REQUIRED, and `/verification`
 * correctly refused to call it "in review", because the ball is with the
 * applicant and telling somebody to wait when they are the one being waited on
 * is the worst answer available. It then left `status` null, which dropped them
 * into a blank `KycFlow` with nothing at all on screen saying what had been
 * asked for. An agent blocked from listing, with no idea why, and a form.
 * SUSPENDED was the same silence with a worse cause.
 *
 * `more_info` carries the reviewer's request under the same discipline the
 * rejection already has: the field is required on the variant, so TypeScript
 * refuses a call site that renders this screen without saying what is wanted.
 * `suspended` is the one state with no self-service route, and it says so and
 * sends the reader to a person rather than to a form that cannot help them.
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
    }
  | {
      state: "more_info";
      /** What the reviewer has asked for. Required: see the note above. */
      request: string;
      /** The one thing to do next. Required, for the same reason. */
      fix: string;
    }
  | {
      state: "suspended";
      /** Why the account is stopped, in whatever words were recorded. */
      reason: string;
    };

/**
 * `?resubmit=1`, and why the link carries a parameter at all.
 *
 * The rejection's recovery link used to point at `/verification`, and
 * `/verification` renders this component whenever a rung has failed. So the one
 * action on the best failure screen in the product landed the reader back on
 * the same failure screen. It was a loop, and nothing on either side of it said
 * so: no state and no parameter reached the flow.
 *
 * The parameter is the state. It lives in the address rather than in a store,
 * so the back button walks out of the flow and a reload stays in it, and the
 * page decides whether to honour it: only the two statuses where the applicant
 * can actually act on it do, so an approved agent cannot land in a resubmission
 * by pasting a link.
 */
export const KYC_RESUBMIT_HREF = "/verification?resubmit=1";

export function KycStatus({ status, retryHref = KYC_RESUBMIT_HREF }: {
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
          <p className="mt-xs text-[var(--nf-text-caption)] text-[var(--nf-content-muted)]">
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

  if (status.state === "more_info") {
    return (
      /*
        NOT `danger`, AND NOT `warning` EITHER, AND THE DIFFERENCE MATTERS.

        Nothing has been refused: a reviewer has read the submission and needs
        one more thing. Rose would tell somebody they had failed when they have
        not, and this product's `warning` token resolves to the same cyan as
        `pending`, which would say "wait" on the one screen whose whole point is
        that waiting is the wrong thing to do. The tone is the pending one
        because it is genuinely mid-process, and every word on the screen says
        the next move is theirs.
      */
      <Panel
        tone="warning"
        pill={MORE_INFO_PILL}
        icon="info"
        title={MORE_INFO_TITLE}
        body={status.request}
      >
        <p className="mt-sm text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          <span className="font-semibold text-[var(--nf-content-primary)]">{FIX_LABEL} </span>
          {status.fix}
        </p>
        <Link
          href={retryHref}
          className="mt-md inline-flex items-center gap-2xs text-[var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
        >
          {CONTINUE}
          <UiIcon name="arrow-right" size="sm" />
        </Link>
      </Panel>
    );
  }

  if (status.state === "suspended") {
    return (
      /*
        THE ONE STATE WITH NO FORM AT THE END OF IT.

        A suspension is a decision about the account rather than about a
        document, so offering "send it again" would be offering something that
        cannot work and would waste the reader's afternoon proving it. The route
        is to a person, and the reason is printed in full whatever it says,
        because somebody stopped from earning is owed the actual words.
      */
      <Panel
        tone="danger"
        pill={SUSPENDED_PILL}
        icon="shield-stop"
        title={SUSPENDED_TITLE}
        body={status.reason}
      >
        <p className="mt-sm text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          <span className="font-semibold text-[var(--nf-content-primary)]">{FIX_LABEL} </span>
          {SUSPENDED_FIX}
        </p>
        <Link
          href="/help"
          className="mt-md inline-flex items-center gap-2xs text-[var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
        >
          {GET_HELP}
          <UiIcon name="arrow-right" size="sm" />
        </Link>
      </Panel>
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
      <p className="mt-sm text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
        <span className="font-semibold text-[var(--nf-content-primary)]">{FIX_LABEL} </span>
        {status.fix}
      </p>
      <Link
        href={retryHref}
        className="mt-md inline-flex items-center gap-2xs text-[var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
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
  /* Widened from a three-name literal union when the fourth and fifth states
     arrived. Still the platform's icon set rather than a free string. */
  icon: UiIconName;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="nf-card p-lg sm:p-lg">
      <div className="flex items-start gap-md">
        <span className="nf-role-mark" aria-hidden="true">
          <UiIcon name={icon} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-xs">
            <h2 className="text-[var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
              {title}
            </h2>
            <StatusPill tone={tone}>{pill}</StatusPill>
          </div>
          <p className="mt-xs text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            {body}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}

/*
 * Every string on this screen, staged in `components/app/untranslated.ts`.
 *
 * It was fifteen `const`s at the foot of this file, which is why the most-read
 * screen in the supply-side funnel was the last one entirely in English: copy
 * that looks like part of a component does not look like copy. The destination
 * is `t.verification.status.*`.
 */
const {
  pendingPill: PENDING_PILL,
  pendingTitle: PENDING_TITLE,
  pendingBody: PENDING_BODY,
  submittedPrefix: SUBMITTED_PREFIX,
  approvedPill: APPROVED_PILL,
  approvedTitle: APPROVED_TITLE,
  approvedBody: APPROVED_BODY,
  rejectedPill: REJECTED_PILL,
  rejectedTitle: REJECTED_TITLE,
  retry: RETRY,
  moreInfoPill: MORE_INFO_PILL,
  moreInfoTitle: MORE_INFO_TITLE,
  moreInfoContinue: CONTINUE,
  suspendedPill: SUSPENDED_PILL,
  suspendedTitle: SUSPENDED_TITLE,
  suspendedFix: SUSPENDED_FIX,
  getHelp: GET_HELP,
  fixLabel: FIX_LABEL,
} = KYC_STATUS_WORDS;
