import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { WorkspaceAssistant } from "@/components/workspace/WorkspaceAssistant";

export const metadata: Metadata = {
  title: "Assistant",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /agent/assistant: Vallo AI inside the listings workspace.
 *
 * The same concierge as `/assistant`, framed by the workspace's shell so an
 * agent, a landlord or a firm never leaves the console to ask it something,
 * and told by key that it is speaking to a lister. Anybody who can open the
 * workspace can open this; the assistant itself answers a stranger as it
 * answers on `/assistant`, so there is no second gate to keep in step.
 */
export default async function AgentAssistantPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const context = await getAgentContext();
  const profile = context.state === "agent" ? agentProfileFrom(context.agent) : null;

  return (
    <AgentShell t={t} locale={locale} active="/agent/assistant" profile={profile} immersive>
      <WorkspaceAssistant workspace="agent" locale={locale} />
    </AgentShell>
  );
}
