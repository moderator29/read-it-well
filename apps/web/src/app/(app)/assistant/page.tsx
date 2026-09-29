import { getDictionary } from "@vallo/i18n";
import { assistantCopyOf } from "@/components/app/assistant/assistant-copy";
import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { readAssistantViewer } from "@/lib/assistant/viewer";
import { AssistantChat } from "@/components/app/assistant/AssistantChat";
import { aiConsentForViewer } from "@/lib/ai/consent-server";

export const metadata: Metadata = { title: "Vallo AI" };

/**
 * AI Assistant destination.
 *
 * A thin server shell: the route is immersive, so `AssistantChat` carries the
 * whole surface, its own bar included, and the thread, the side navigation
 * and the composer all hydrate together.
 *
 * The one fact read here is who is asking, for the mark beside their own
 * bubbles (`readAssistantViewer`, shared with the workspace assistants).
 */
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  /* The locale is read here rather than inside the client component: a rating
     or a price in the assistant's result cards must group its digits the same
     way as the same figure on the search page. */
  const [locale, viewer] = await Promise.all([getLocale(), readAssistantViewer()]);
  return (
    <AssistantChat
      locale={locale}
      viewer={viewer}
      aiConsented={await aiConsentForViewer()}
      t={assistantCopyOf(getDictionary(locale))}
    />
  );
}
