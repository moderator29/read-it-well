import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { AgentInbox } from "@/app/agent/messages/AgentInbox";
import { AGENT_INBOX, AGENT_PROFILE } from "../ops-fixtures";

/** The agent's enquiry inbox, from fixture threads. */
export const dynamic = "force-dynamic";

export default async function PreviewAgentMessages() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/messages" profile={AGENT_PROFILE}>
      <div className="mb-lg">
        <h1 className="nf-h1">{t.agent.nav.messages}</h1>
        <p className="mt-3xs text-[var(--nf-content-secondary)]">
          1 enquiry is waiting on you.
        </p>
      </div>
      <AgentInbox inbox={AGENT_INBOX} filter="waiting" />
    </AgentShell>
  );
}
