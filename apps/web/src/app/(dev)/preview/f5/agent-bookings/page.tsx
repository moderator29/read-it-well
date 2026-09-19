import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { BookingsWorkspace } from "@/app/agent/bookings/BookingsWorkspace";
import { AGENT_BOOKINGS, AGENT_PROFILE } from "../ops-fixtures";

/** The agent's bookings board, from a fixture board. */
export const dynamic = "force-dynamic";

export default async function PreviewAgentBookings() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/bookings" profile={AGENT_PROFILE}>
      <div className="mb-lg">
        <h1 className="nf-h1">{t.agentBookings.title}</h1>
        <p className="mt-2xs text-[var(--nf-content-secondary)]">{t.agentBookings.lede}</p>
      </div>
      <BookingsWorkspace t={t.agentBookings} board={AGENT_BOOKINGS} locale={locale} />
    </AgentShell>
  );
}
