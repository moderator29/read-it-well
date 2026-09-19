import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { AnalyticsWorkspace } from "@/app/agent/analytics/AnalyticsWorkspace";
import { AGENT_ANALYTICS, AGENT_PROFILE } from "../ops-fixtures";

/** The agent's analytics workspace, from fixture aggregates. */
export const dynamic = "force-dynamic";

export default async function PreviewAgentAnalytics() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/analytics" profile={AGENT_PROFILE}>
      <div className="mb-lg">
        <h1 className="nf-h1">{t.agentAnalytics.title}</h1>
        <p className="mt-2xs text-[var(--nf-content-secondary)]">{t.agentAnalytics.lede}</p>
      </div>
      <AnalyticsWorkspace
        t={t.agentAnalytics}
        hours={{ one: t.agentBookings.card.hoursOne, other: t.agentBookings.card.hours }}
        statusLabels={t.agentListings.workspace.status}
        analytics={AGENT_ANALYTICS}
        locale={locale}
      />
    </AgentShell>
  );
}
