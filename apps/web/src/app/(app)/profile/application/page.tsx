import type { Metadata } from "next";
import { getDictionary, formatDate } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { readMyApplication } from "@/lib/agent/application-status";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, Row, RowList, Section, Stack, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";

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
   * Timeline model. Three stages; how far the application has travelled maps
   * straight off the canonical status. MORE_INFO_REQUIRED holds at the review
   * stage because the review is still open, just waiting on the applicant.
   */
  const stageIndex = decided ? 2 : application.status === "DRAFT" ? -1 : 1;
  const stages: { label: string; note?: string }[] = [
    {
      label: s.submittedTitle,
      note: application.submittedAt
        ? `${s.submittedOn} ${formatDate(new Date(application.submittedAt), locale)}`
        : undefined,
    },
    {
      label: s.underReview,
      note: application.status === "MORE_INFO_REQUIRED" ? s.moreInfo : s.reviewNote,
    },
    {
      label: decided ? statusLabel[application.status] : s.approved,
      note: application.reviewedAt
        ? `${s.reviewedOn} ${formatDate(new Date(application.reviewedAt), locale)}`
        : undefined,
    },
  ];

  const reviewerNote = (application.reviewNotes ?? "").trim();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={s.status} subtitle={s.submittedBody} fallback="/profile" />

      <Stack>
        {/* ONE SURFACE, three parts, the label outside it. */}
        <Section title={s.applicationId}>
          <RowList boxed inset={false}>
            {/* The reference. The only string support will ever ask for, so it
                keeps the biggest type on the page after the heading. */}
            <Row className="flex-wrap justify-between gap-y-2">
              <span className="nf-numeric nf-h4 tracking-[0.04em]">{application.reference}</span>
              <StatusPill tone={toneForStatus(application.status)}>
                {statusLabel[application.status]}
              </StatusPill>
            </Row>

            {/* The journey. Dots and a hairline rail; completed stages solid,
                the current one warm, upcoming ones quiet. */}
            <Row className="flex-col items-stretch py-5">
              <ol className="w-full">
                {stages.map((stage, i) => {
                  const done = i < stageIndex || (i === stageIndex && decided);
                  const current = i === stageIndex && !decided;
                  return (
                    <li key={stage.label} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < stages.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute left-[0.5rem] top-5 h-[calc(100%-1rem)] w-px"
                          style={{
                            background: done
                              ? "var(--nf-state-success)"
                              : "var(--nf-border-subtle)",
                            opacity: done ? 0.45 : 1,
                          }}
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className="mt-1 grid h-[1.05rem] w-[1.05rem] shrink-0 place-items-center rounded-full border"
                        style={
                          done
                            ? {
                                background: "var(--nf-status-approved-surface)",
                                borderColor: "var(--nf-status-approved)",
                              }
                            : current
                              ? {
                                  background: "var(--nf-status-pending-surface)",
                                  borderColor: "var(--nf-status-pending)",
                                }
                              : { borderColor: "var(--nf-border-subtle)" }
                        }
                      >
                        {done && (
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: "var(--nf-state-success)" }}
                          />
                        )}
                        {current && (
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: "var(--nf-state-warning)" }}
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={
                            done || current ? TYPE.rowTitle : `${TYPE.rowTitle} opacity-60`
                          }
                        >
                          {stage.label}
                        </span>
                        {stage.note && (done || current) && (
                          <span className={`mt-0.5 block ${TYPE.rowMeta}`}>{stage.note}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Row>

            {reviewerNote.length > 0 && (
              <Row className="flex-col items-start gap-1 py-5">
                <span className={TYPE.label}>{s.reviewerNote}</span>
                <p className={`whitespace-pre-line ${TYPE.body}`}>{reviewerNote}</p>
              </Row>
            )}
          </RowList>
        </Section>

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
