import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { ReviewsWorkspace } from "@/app/agent/reviews/ReviewsWorkspace";
import { AGENT_PROFILE, AGENT_REVIEWS, AGENT_REVIEWS_SUMMARY } from "../ops-fixtures";

/** The agent's reviews workspace, from fixture reviews. */
export const dynamic = "force-dynamic";

export default async function PreviewAgentReviews() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/reviews" profile={AGENT_PROFILE}>
      <div className="mb-lg">
        <h1 className="nf-h1">{t.agent.nav.reviews}</h1>
        <p className="mt-3xs text-[var(--nf-content-secondary)]">
          1 review is waiting on an answer.
        </p>
      </div>
      <ReviewsWorkspace
        reviews={AGENT_REVIEWS}
        summary={AGENT_REVIEWS_SUMMARY}
        filter="all"
        locale={locale}
      />
    </AgentShell>
  );
}
