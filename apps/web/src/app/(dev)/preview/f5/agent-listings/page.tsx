import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { ListingsWorkspace } from "@/app/agent/listings/ListingsWorkspace";
import { AGENT_LISTINGS, AGENT_PROFILE } from "../ops-fixtures";

/** The agent's properties workspace, from fixture listings. */
export const dynamic = "force-dynamic";

export default async function PreviewAgentListings() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/listings" profile={AGENT_PROFILE}>
      <div className="mb-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="nf-h1">{t.agentListings.workspace.title}</h1>
          <p className="mt-2xs text-[var(--nf-content-secondary)]">
            {t.agentListings.workspace.lede}
          </p>
        </div>
      </div>
      <ListingsWorkspace t={t.agentListings} listings={AGENT_LISTINGS} locale={locale} />
    </AgentShell>
  );
}
