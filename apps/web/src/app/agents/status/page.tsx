import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, formatDate } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentRepository } from "@/lib/agent/repository";
import { SiteHeader } from "@/components/site/SiteHeader";
import { BackButton } from "@/components/site/BackButton";
import { BrandIcon } from "@/design-system/icons/BrandIcon";

export const metadata: Metadata = {
  title: "Application status",
  robots: { index: false, follow: false },
};

/**
 * Agent application status.
 *
 * The status comes from the agent repository. The seed profile is APPROVED so
 * the whole flow is explorable, and the CTA changes with the state: an approved
 * applicant can enter Agent Mode, a pending one waits. The status vocabulary is
 * the canonical set from intake C-03.
 *
 * The NF-AGT reference is the hero object of the page (it is what support will
 * ask for), and beneath it the application's journey renders as a three stage
 * timeline: submitted, under review, decision.
 */
export default async function AgentStatusPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const s = t.agent.status;
  const profile = await getAgentRepository().getProfile();

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
    { label: decided ? statusLabel[profile.status] : s.approved },
  ];

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
            <span
              className="mx-auto grid h-20 w-20 place-items-center rounded-full"
              style={{
                background: approved
                  ? "var(--nf-state-success-surface)"
                  : "color-mix(in oklab, var(--nf-mode-agent) 18%, transparent)",
              }}
            >
              <span className="inline-grid h-12 w-12 place-items-center">
                <BrandIcon name={approved ? "shield-check" : "calendar-check"} fill />
              </span>
            </span>

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
              {profile.applicationRef}
            </p>
            <p className="mt-3">
              <span
                className="nf-badge"
                style={
                  approved
                    ? { background: "var(--nf-state-success-surface)", color: "var(--nf-state-success)" }
                    : { background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" }
                }
              >
                {statusLabel[profile.status]}
              </span>
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
                              background: "var(--nf-state-success-surface)",
                              borderColor: "var(--nf-state-success)",
                            }
                          : current
                            ? {
                                background: "var(--nf-state-warning-surface)",
                                borderColor: "var(--nf-state-warning)",
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

          {pending && (
            <p className="mt-5 flex items-center justify-center gap-2 text-center text-[0.8125rem] text-[var(--nf-content-muted)]">
              <span className="inline-grid h-8 w-8 shrink-0 place-items-center">
                <BrandIcon name="calendar-check" fill />
              </span>
              {s.reviewNote}
            </p>
          )}

          <div
            className="nf-rise mt-8 flex flex-wrap justify-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            {approved ? (
              <Link href="/agent/dashboard" className="nf-btn nf-btn--primary nf-btn--lg">
                {s.enterAgent}
              </Link>
            ) : null}
            <Link href="/home" className="nf-btn nf-btn--glass nf-btn--lg">
              {s.backHome}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
