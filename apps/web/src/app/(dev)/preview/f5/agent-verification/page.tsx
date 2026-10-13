import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { Ladder, Standing } from "@/app/agent/verification/VerificationLadder";
import { AGENT_LADDER, AGENT_PROFILE } from "../ops-fixtures";

/** Where an agent stands on the four-rung ladder, from a fixture ladder. */
export const dynamic = "force-dynamic";

export default async function PreviewAgentVerification() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/verification" profile={AGENT_PROFILE}>
      <div className="mb-lg">
        <h1 className="nf-h1">{t.agent.nav.verification}</h1>
        <p className="mt-2xs max-w-[60ch] text-[var(--nf-content-secondary)]">
          Four checks, in order. Each one you pass is shown to guests on every
          listing you have, and none of them is a fee.
        </p>
      </div>
      <div className="grid gap-lg lg:grid-cols-[1fr_20rem]">
        <div className="lg:order-2">
          <Standing tier={AGENT_LADDER.tier} />
        </div>
        <div className="lg:order-1">
          <Ladder ladder={AGENT_LADDER} />
        </div>
      </div>
    </AgentShell>
  );
}
