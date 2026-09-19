import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { EarningsWorkspace } from "@/app/agent/earnings/EarningsWorkspace";
import { AGENT_EARNINGS, AGENT_PROFILE } from "../ops-fixtures";

/** The agent's earnings workspace, from a fixture ledger. */
export const dynamic = "force-dynamic";

export default async function PreviewAgentEarnings() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/earnings" profile={AGENT_PROFILE}>
      <div className="mb-lg">
        <h1 className="nf-h1">{t.agentEarnings.title}</h1>
        <p className="mt-2xs text-[var(--nf-content-secondary)]">{t.agentEarnings.lede}</p>
      </div>
      <EarningsWorkspace t={t.agentEarnings} earnings={AGENT_EARNINGS} locale={locale} />
    </AgentShell>
  );
}
