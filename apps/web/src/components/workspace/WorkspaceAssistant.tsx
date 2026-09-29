import type { Locale } from "@vallo/i18n/core";
import { getDictionary } from "@vallo/i18n";
import { AssistantChat } from "@/components/app/assistant/AssistantChat";
import { assistantCopyOf } from "@/components/app/assistant/assistant-copy";
import { readAssistantViewer } from "@/lib/assistant/viewer";
import { aiConsentForViewer } from "@/lib/ai/consent-server";
import type { AssistantWorkspace } from "@/lib/assistant/workspace";

/**
 * The assistant as a workspace screen: the same `AssistantChat` as
 * `/assistant`, with the same viewer mark and the same consent gate, told
 * which workspace it is in so its prompts and its instructions are the
 * workspace's (`lib/assistant/workspace.ts`). The shell around it is the
 * workspace's own, rendered by the page with `immersive`.
 */
export async function WorkspaceAssistant({
  workspace,
  locale,
}: {
  workspace: AssistantWorkspace;
  locale: Locale;
}) {
  const [viewer, consented] = await Promise.all([readAssistantViewer(), aiConsentForViewer()]);
  return (
    <AssistantChat
      locale={locale}
      viewer={viewer}
      aiConsented={consented}
      workspace={workspace}
      t={assistantCopyOf(getDictionary(locale))}
    />
  );
}
