import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { AssistantChat } from "@/components/app/assistant/AssistantChat";
import { assistantCopyOf } from "@/components/app/assistant/assistant-copy";

/**
 * The assistant inside the listings workspace (`/agent/assistant`), on the
 * agent shell. The route needs an agent's session; this renders the same
 * pieces with no stored conversation, so the workspace's own prompts show.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAgentAssistant() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/assistant" profile={null} immersive>
      <AssistantChat locale={locale} workspace="agent" seed={{ threads: [] }} t={assistantCopyOf(t)} />
    </AgentShell>
  );
}
