import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { AssistantChat } from "@/components/app/assistant/AssistantChat";
import { assistantCopyOf } from "@/components/app/assistant/assistant-copy";

/**
 * The assistant inside the host workspace (`/host/assistant`), on the host
 * shell, with no stored conversation so the host's own prompts show.
 */
export const dynamic = "force-dynamic";

export default async function PreviewHostAssistant() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <HostShell fallback="/host" immersive>
      <AssistantChat locale={locale} workspace="host" seed={{ threads: [] }} t={assistantCopyOf(t)} />
    </HostShell>
  );
}
