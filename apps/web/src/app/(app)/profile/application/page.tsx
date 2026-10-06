import type { Metadata } from "next";
import { getDictionary, formatDate } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { readMyApplication } from "@/lib/agent/application-status";
import { SuccessFromFlag } from "@/components/ui/SuccessFromFlag";
import { applicationArrival } from "@/lib/ui/arrival-moments";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, Row, RowList, Section, Stack, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { RespondToReview } from "@/components/agent/RespondToReview";
import { StatusTrack, type TrackStep } from "@/components/app/status/StatusTrack";
import { applicationTrack } from "@/components/app/status/tracks";

export const metadata: Metadata = {
  title: "Your application",
  robots: { index: false, follow: false },
};

/**
 * WHERE A PROFILE APPLICATION STANDS.
 *
 * Moved from `/agents/status`, and the move is the same argument as the setup
 * form's: this is a fact about YOUR ACCOUNT, so it belongs beside the account
 * rather than behind the public marketing chrome, with a site header, a footer
 * and a back button pointing at a pitch page that no longer exists.
 *
 * WHAT THE REBUILD CHANGED, beyond the address:
 *
 *  - FOUR STACKED CARDS BECAME ONE SURFACE. The reference, the status, the
 *    timeline and the reviewer's note were four bordered boxes down a 390px
 *    screen, each with its own radius and its own shadow, for four parts of
 *    one fact. They are one boxed `RowList` now with the label outside it.
 *  - THE EMPTY STATES ARE THE PLATFORM'S ONE EMPTY STATE. Three bespoke
 *    centred hero blocks became `EmptyState`, the same object the Saved screen
 *    and the profile's own posts tab use.
 *  - THE TYPE COMES OFF THE SCALE. Six arbitrary `text-[Nrem]` values went.
 *
 * Nothing about WHAT is shown changed. The reference is still the loudest
 * thing after the heading, because support asks for that number; the seven
 * canonical statuses still map through `toneForStatus` rather than a two-way
 * approved/pending split that painted a rejection amber; the reviewer's note
 * still renders whenever there is one, because an unread note on a refusal is
 * the difference between an answer and a disappearance.
 */
export default async function ProfileApplicationPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const s = t.agent.status;
  const result = await readMyApplication();

  if (result.state !== "found") {
    const empty = {
      unconfigured: {
        icon: "shield-check" as const,
        title: s.unconfiguredTitle,
        body: s.unconfiguredBody,
        cta: null,
      },
      "signed-out": {
        icon: "user-check" as const,
        title: s.signedOutTitle,
        body: s.signedOutBody,
        cta: { href: "/sign-in", label: s.signIn },
      },
      none: {
        icon: "doc-shield" as const,
        title: s.noneTitle,
        body: s.noneBody,
        /* The one place a person still starts one, and it is the profile they
           are setting up rather than a marketing page. */
        cta: { href: "/profile/setup/owner", label: s.startApplication },
      },
    }[result.state];

    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={s.status} fallback="/profile" />
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          body={empty.body}
          action={
            empty.cta ? (
              <ButtonLink href={empty.cta.href} variant="primary" size="lg">
                {empty.cta.label}
              </ButtonLink>
            ) : undefined
          }
        />
      </div>
    );
  }

  const application = result.application;

  const statusLabel: Record<typeof application.status, string> = {
    DRAFT: s.draft,
    SUBMITTED: s.pendingReview,
    UNDER_REVIEW: s.underReview,
    MORE_INFO_REQUIRED: s.moreInfo,
    APPROVED: s.approved,
    REJECTED: s.rejected,
    SUSPENDED: s.rejected,
  };

  const approved = application.status === "APPROVED";
  const decided =
    approved || application.status === "REJECTED" || application.status === "SUSPENDED";

  /*
   * The track (spec section 14): submitted, under review, decided. How far it
   * has travelled maps straight off the canonical status in `applicationTrack`;
   * MORE_INFO_REQUIRED holds at review because the review is still open, and a
   * refusal is the decision step, stopped. Times only from the row.
   */
  const track = applicationTrack({
    status: application.status,
    submittedAt: application.submittedAt,
    reviewedAt: application.reviewedAt,
  });
  const trackLabels: Record<(typeof track)[number]["key"], string> = {
    submitted: s.submittedTitle,
    review: s.underReview,
    decision: decided ? statusLabel[application.status] : s.approved,
  };
  const trackSteps: TrackStep[] = track.map((step) => ({
    key: step.key,
    label: trackLabels[step.key],
    when: step.at ? formatDate(new Date(step.at), locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : null,
    note:
      step.key === "review" && step.state === "current"
        ? application.status === "MORE_INFO_REQUIRED"
          ? s.moreInfo
          : s.reviewNote
        : null,
    state: step.state,
  }));

  const reviewerNote = (application.reviewNotes ?? "").trim();

  /* Approved in the staff console, announced by a notice that lands here:
     once per device, while the decision is news (docs/SUCCESS_MOMENTS.md). */
  const approval = applicationArrival(application, requestNow());

  return (
    <div className="mx-auto max-w-2xl">
      <SuccessFromFlag
        copy={t.success}
        show={approval !== null}
        moment={approval?.moment ?? "agentApproved"}
        seenKey={approval?.seenKey ?? "agent-approved:none"}
        haptic={false}
      />
      <PageHeader title={s.status} subtitle={s.submittedBody} fallback="/profile" />

      <Stack>
        {/* ONE SURFACE, three parts, the label outside it. */}
        <Section title={s.applicationId}>
          <RowList boxed inset={false}>
            {/* The reference. The only string support will ever ask for, so it
                keeps the biggest type on the page after the heading. */}
            <Row className="flex-wrap justify-between gap-y-xs">
              <span className="nf-numeric nf-h4 tracking-[0.04em]">{application.reference}</span>
              <StatusPill tone={toneForStatus(application.status)}>
                {statusLabel[application.status]}
              </StatusPill>
            </Row>

            {/* The journey, on the shared status track. */}
            <Row className="flex-col items-stretch py-lg">
              <StatusTrack label={s.status} steps={trackSteps} testId="application-track" />
            </Row>

            {reviewerNote.length > 0 && (
              <Row className="flex-col items-start gap-2xs py-lg">
                <span className={TYPE.label}>{s.reviewerNote}</span>
                <p className={`whitespace-pre-line ${TYPE.body}`}>{reviewerNote}</p>
              </Row>
            )}
          </RowList>
        </Section>

        {/* SUP-05: the reviewer asked for something, so the answer is here,
            under their note, rather than in an email that pointed nowhere. */}
        {application.status === "MORE_INFO_REQUIRED" && <RespondToReview t={t} />}

        {approved && (
          <div className="flex justify-center">
            <ButtonLink href="/agent/dashboard" variant="primary" size="lg">
              {s.enterAgent}
            </ButtonLink>
          </div>
        )}
      </Stack>
    </div>
  );
}

/** The request's clock, read once, so the page agrees with itself. */
function requestNow(): number {
  return Date.now();
}
