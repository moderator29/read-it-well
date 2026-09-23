import Link from "next/link";
import { getDictionary, type Locale } from "@vallo/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { StatusPill } from "@/components/ui/StatusPill";
import { ICON_PLATE_GLYPH, IconPlate, type IconPlateTone } from "@/components/ui/IconPlate";

/* The status plate takes the state's own tone on the shared plate (orphans
   sweep): pending for waiting, emerald for approved, rose for refused. */
const PLATE_TONE: Record<"warning" | "success" | "danger", IconPlateTone> = {
  warning: "pending",
  success: "success",
  danger: "error",
};

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

export function KycStatus({
  status,
  locale,
  retryHref = KYC_RESUBMIT_HREF,
}: {
  status: KycStatusView;
  /**
   * The reader's language.
   *
   * Read here rather than threaded down as eighteen props, which is the same
   * call `TransactionsSection` makes for the same reason: `getDictionary` is a
   * lookup in a static object, so there is nothing to save by passing the words
   * in, and one caller passing one locale cannot get half of this screen into a
   * different language than the other half.
   */
  locale: Locale;
  retryHref?: string;
}) {
  const w = getDictionary(locale).verification.status;
  if (status.state === "pending") {
    return (
      <Panel
        tone="warning"
        pill={w.pendingPill}
        icon="calendar-booking"
        title={w.pendingTitle}
        body={w.pendingBody}
      >
        {status.submittedAt && (
          <p className="mt-xs text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">
            {w.submittedPrefix} {status.submittedAt}
          </p>
        )}
      </Panel>
    );
  }

  if (status.state === "approved") {
    return (
      <Panel
        tone="success"
        pill={w.approvedPill}
        icon="verified"
        title={w.approvedTitle}
        body={w.approvedBody}
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
        pill={w.moreInfoPill}
        icon="info"
        title={w.moreInfoTitle}
        body={status.request}
      >
        <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          <span className="font-semibold text-[var(--nf-content-primary)]">{w.fixLabel} </span>
          {status.fix}
        </p>
        <Link
          href={retryHref}
          className="mt-md inline-flex items-center gap-2xs text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
        >
          {w.moreInfoContinue}
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
        pill={w.suspendedPill}
        icon="shield-stop"
        title={w.suspendedTitle}
        body={status.reason}
      >
        <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          <span className="font-semibold text-[var(--nf-content-primary)]">{w.fixLabel} </span>
          {w.suspendedFix}
        </p>
        <Link
          href="/help"
          className="mt-md inline-flex items-center gap-2xs text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
        >
          {w.getHelp}
          <UiIcon name="arrow-right" size="sm" />
        </Link>
      </Panel>
    );
  }

  return (
    <Panel
      tone="danger"
      pill={w.rejectedPill}
      icon="shield-stop"
      title={w.rejectedTitle}
      body={status.reason}
    >
      {/*
        The fix, given the same weight as the reason. A reader who has just been
        refused stops reading, so the sentence that tells them it is
        recoverable has to be immediately underneath and cannot be small print.
      */}
      <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
        <span className="font-semibold text-[var(--nf-content-primary)]">{w.fixLabel} </span>
        {status.fix}
      </p>
      <Link
        href={retryHref}
        className="mt-md inline-flex items-center gap-2xs text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
      >
        {w.retry}
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
    <section className="nf-panel nf-panel--card block p-lg">
      <div className="flex items-start gap-md">
        <IconPlate size="md" tone={PLATE_TONE[tone]}>
          <UiIcon name={icon} size={ICON_PLATE_GLYPH.md} />
        </IconPlate>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-xs">
            <h2 className="text-[length:var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
              {title}
            </h2>
            <StatusPill tone={tone}>{pill}</StatusPill>
          </div>
          <p className="mt-xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            {body}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}


