import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { ListingWizard } from "@/app/agent/list/ListingWizard";
import { AMENITY_CHOICES, STATE_CODES } from "@/lib/agent/listings-schema";
import { AGENT_PROFILE } from "../ops-fixtures";

/**
 * `/agent/list`, the listing wizard, at its first step.
 *
 * `canPersist` is false, which is the wizard's own signed-out path rather than
 * a preview-only branch: it draws every control and writes nothing. The wizard
 * is the longest form in the console and had no picture at all, which is how a
 * shape on it could survive a sweep.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAgentList() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/list" profile={AGENT_PROFILE}>
      <ListingWizard
        copy={t.agentListings}
        locale={locale}
        userId={null}
        states={STATE_CODES.map((code) => ({ code, name: code }))}
        amenities={AMENITY_CHOICES}
        initial={null}
        canPersist={false}
      />
    </AgentShell>
  );
}
