import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { ListingSentForReview } from "@/app/agent/list/ListingSentForReview";
import { AGENT_PROFILE } from "../ops-fixtures";

/**
 * GOVERNING-08 screen four, on its own.
 *
 * The real screen appears only after a real listing has gone to a real review
 * queue, which makes it the one screen in the wizard that a sweep could not
 * photograph. It holds no state, so it is a component and this is a door onto
 * it. Nothing here fakes a submission: the screen genuinely has nothing to
 * say that depends on one.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAgentListSent() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/list" profile={AGENT_PROFILE}>
      <ListingSentForReview copy={t.agentListings} reference={t.listingReference} />
    </AgentShell>
  );
}
