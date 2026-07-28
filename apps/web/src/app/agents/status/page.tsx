import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, formatDate } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentRepository } from "@/lib/agent/repository";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Icon } from "@/design-system/icons/Icon";

export const metadata: Metadata = {
  title: "Application status",
  robots: { index: false, follow: false },
};

/**
 * Agent application status, matching reference 02.
 *
 * The status comes from the agent repository. The seed profile is APPROVED so
 * the whole flow is explorable, and the CTA changes with the state: an approved
 * applicant can enter Agent Mode, a pending one waits. The status vocabulary is
 * the canonical set from intake C-03.
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

  return (
    <>
      <SiteHeader t={t} locale={locale} />

      <main id="main" className="nf-shell py-16">
        <div className="mx-auto max-w-md text-center">
          <span
            className="mx-auto grid h-24 w-24 place-items-center rounded-full"
            style={{
              background: approved
                ? "var(--nf-state-success-surface)"
                : "color-mix(in oklab, var(--nf-mode-agent) 18%, transparent)",
            }}
          >
            <Icon name={approved ? "verified" : "booking"} size={62} />
          </span>

          <h1 className="nf-h1 mt-6">
            {approved ? s.approved : s.submittedTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
            {s.submittedBody}
          </p>

          <dl className="nf-card mt-8 space-y-3 p-5 text-left text-[0.875rem]">
            <div className="flex items-center justify-between">
              <dt className="text-[var(--nf-content-muted)]">{s.status}</dt>
              <dd>
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
              </dd>
            </div>
            {profile.submittedAt && (
              <div className="nf-hairline flex items-center justify-between pt-3">
                <dt className="text-[var(--nf-content-muted)]">{s.submittedOn}</dt>
                <dd className="nf-numeric font-semibold">
                  {formatDate(new Date(profile.submittedAt), locale)}
                </dd>
              </div>
            )}
            <div className="nf-hairline flex items-center justify-between pt-3">
              <dt className="text-[var(--nf-content-muted)]">{s.applicationId}</dt>
              <dd className="nf-numeric font-semibold">{profile.applicationRef}</dd>
            </div>
          </dl>

          {pending && (
            <p className="mt-5 flex items-center justify-center gap-2 text-[0.8125rem] text-[var(--nf-content-muted)]">
              <Icon name="booking" size={20} />
              {s.reviewNote}
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
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

      <SiteFooter t={t} />
    </>
  );
}
