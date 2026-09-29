import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
 * and told by key that it is speaking to a lister.
 *
 * Without an agent row there is no workspace to frame it in, and the lister
 * framing would be wrong, so this is the ordinary `/assistant`, exactly as
 * `/agent/notifications` falls back to `/notifications`.
 */
export default async function AgentAssistantPage() {
  const context = await getAgentContext();
  if (context.state === "signed-out" || context.state === "not-agent") redirect("/assistant");

  const locale = await getLocale();
  const t = getDictionary(locale);
  const profile = context.state === "agent" ? agentProfileFrom(context.agent) : null;

  return (
    <AgentShell t={t} locale={locale} active="/agent/assistant" profile={profile} immersive>
      <WorkspaceAssistant workspace="agent" locale={locale} />
    </AgentShell>
  );
}
