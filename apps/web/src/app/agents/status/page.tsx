import type { Metadata } from "next";
import { getDictionary, formatDate } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { readMyApplication } from "@/lib/agent/application-status";
import { SiteHeader } from "@/components/site/SiteHeader";
import { BackButton } from "@/components/site/BackButton";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { StatusIcon } from "./StatusIcon";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";

export const metadata: Metadata = {
  title: "Application status",
  robots: { index: false, follow: false },
};

/**
 * Agent application status.
 *
 * The application is the caller's own row in `agent_applications`, read under
 * their own RLS policy. It used to be a seed object called "Demo Agent" with a
 * fixed reference and an APPROVED status, which meant a stranger who had never
 * applied for anything was shown an approved application and a reference number
 * support would then be asked about.
 *
 * Four states, all designed. Signed out asks them to sign in, because the
 * reference belongs to an account. No application on file says exactly that and
 * offers the way to start one. An unreadable answer promises nothing either
 * way. Only a real row renders the timeline. The CTA still changes with the
 * state: an approved applicant can enter Agent Mode, a pending one waits. The
 * status vocabulary is the canonical set from intake C-03.
 *
 * The NF-AGT reference is the hero object of the page (it is what support will
 * ask for), and beneath it the application's journey renders as a three stage
 * timeline: submitted, under review, decision.
 */
export default async function AgentStatusPage() {
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
        cta: { href: "/agents/apply", label: s.startApplication },
      },
    }[result.state];

    return (
      <>
        <SiteHeader t={t} locale={locale} />
        <main id="main" className="nf-shell py-12 sm:py-16">
          <div className="mx-auto max-w-md">
            <div className="nf-rise mb-6">
              <BackButton fallback="/agents" />
            </div>
            <div className="nf-rise text-center">
              <span className="mx-auto block h-20 w-20">
                <BrandIcon name={empty.icon} fill />
              </span>
              <h1 className="nf-h1 mt-5">{empty.title}</h1>
              <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
                {empty.body}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-4">
                {empty.cta && (
                  <ButtonLink href={empty.cta.href} variant="primary" size="lg">
                    {empty.cta.label}
                  </ButtonLink>
                )}
                <ButtonLink href="/home" variant="secondary" size="lg">
                  {s.backHome}
                </ButtonLink>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const profile = result.application;

  const statusLabel: Record<typeof profile.status, string> = {
    DRAFT: s.draft,
    SUBMITTED: s.pendingReview,
    UNDER_REVIEW: s.underReview,
    MORE_INFO_REQUIRED: s.moreInfo,
    APPROVED: s.approved,
    REJECTED: s.rejected,
    SUSPENDED: s.rejected,
  };

  const approved = profile.status === "APPROVED";
  const pending = profile.status === "SUBMITTED" || profile.status === "UNDER_REVIEW";
  const decided = approved || profile.status === "REJECTED" || profile.status === "SUSPENDED";

  /*
   * Timeline model. Three stages; how far the application has travelled maps
   * straight off the canonical status. MORE_INFO_REQUIRED holds at the review
   * stage because the review is still open, just waiting on the applicant.
   */
  const stageIndex = decided ? 2 : profile.status === "DRAFT" ? -1 : 1;
  const stages: { label: string; note?: string }[] = [
    {
      label: s.submittedTitle,
      note: profile.submittedAt
        ? `${s.submittedOn} ${formatDate(new Date(profile.submittedAt), locale)}`
        : undefined,
    },
    {
      label: s.underReview,
      note: profile.status === "MORE_INFO_REQUIRED" ? s.moreInfo : s.reviewNote,
    },
    {
      label: decided ? statusLabel[profile.status] : s.approved,
      note: profile.reviewedAt
        ? `${s.reviewedOn} ${formatDate(new Date(profile.reviewedAt), locale)}`
        : undefined,
    },
  ];

  /* What the reviewer actually wrote. It matters most on the two states where
     the applicant has something to do about it, and an unread note on a
     rejection is the difference between an answer and a disappearance. */
  const reviewerNote = (profile.reviewNotes ?? "").trim();

  return (
    <>
      <SiteHeader t={t} locale={locale} />

      <main id="main" className="nf-shell py-12 sm:py-16">
        <div className="mx-auto max-w-md">
          {/* Way back, top left: to wherever you came from, or the pitch. */}
          <div className="nf-rise mb-6">
            <BackButton fallback="/agents" />
          </div>

          <div className="nf-rise text-center">
            <StatusIcon
              approved={approved}
              applicationRef={profile.reference}
              icon={approved ? "shield-check" : "calendar-check"}
            />

            <h1 className="nf-h1 mt-5">{approved ? s.approved : s.submittedTitle}</h1>
            <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
              {s.submittedBody}
            </p>
          </div>

          {/* The reference, front and centre. Support asks for this number, so
              it gets the biggest type on the page after the heading. */}
          <div
            className="nf-card nf-rise mt-8 p-5 text-center sm:p-6"
            style={{ animationDelay: "80ms" }}
          >
            <p className="nf-overline">{s.applicationId}</p>
            <p className="nf-numeric mt-1.5 text-[1.5rem] font-bold tracking-[0.04em] sm:text-[1.75rem]">
              {profile.reference}
            </p>
            {/* The two-way approved/pending split painted a REJECTED or
                SUSPENDED application amber, as though it were still waiting.
                The shared map tells the truth about all seven states. */}
            <p className="mt-3">
              <StatusPill tone={toneForStatus(profile.status)}>
                {statusLabel[profile.status]}
              </StatusPill>
            </p>
          </div>

          {/* Journey timeline. Dots and a hairline rail; completed stages are
              solid, the current stage glows, upcoming stages stay quiet. */}
          <div
            className="nf-card nf-rise mt-4 p-5 text-left sm:p-6"
            style={{ animationDelay: "160ms" }}
          >
            <h2 className="nf-overline">{s.status}</h2>
            <ol className="mt-4">
              {stages.map((stage, i) => {
                const done = i < stageIndex || (i === stageIndex && decided);
                const current = i === stageIndex && !decided;
                return (
                  <li key={stage.label} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Rail segment down to the next dot. */}
                    {i < stages.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-[0.5rem] top-5 h-[calc(100%-1rem)] w-px"
                        style={{
                          background: done ? "var(--nf-state-success)" : "var(--nf-border-subtle)",
                          opacity: done ? 0.45 : 1,
                        }}
                      />
                    )}
                    {/* Stage dot. */}
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
                        className={[
                          "block text-[0.9375rem] font-semibold leading-snug",
                          done || current ? "" : "text-[var(--nf-content-muted)]",
                        ].join(" ")}
                      >
                        {stage.label}
                      </span>
                      {stage.note && (done || current) && (
                        <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                          {stage.note}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {reviewerNote.length > 0 && (
            <div
              className="nf-card nf-rise mt-4 p-5 text-left sm:p-6"
              style={{ animationDelay: "200ms" }}
            >
              <h2 className="nf-overline">{s.reviewerNote}</h2>
              <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {reviewerNote}
              </p>
            </div>
          )}

          {pending && (
            <p className="mt-5 flex items-center justify-center gap-2 text-center text-[0.8125rem] text-[var(--nf-content-muted)]">
              <span className="inline-grid h-10 w-10 shrink-0 place-items-center">
                <BrandIcon name="calendar-check" fill />
              </span>
              {s.reviewNote}
            </p>
          )}

          <div
            className="nf-rise mt-8 flex flex-wrap justify-center gap-4"
            style={{ animationDelay: "240ms" }}
          >
            {approved ? (
              <ButtonLink href="/agent/dashboard" variant="primary" size="lg">
                {s.enterAgent}
              </ButtonLink>
            ) : null}
            <ButtonLink href="/home" variant="secondary" size="lg">
              {s.backHome}
            </ButtonLink>
          </div>
        </div>
      </main>
    </>
  );
}
