import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { ComingSoon } from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "AI Assistant" };

/**
 * AI Assistant destination.
 *
 * Reserved so the rail and tab bar never dead-end here (Master Rule 55). The
 * `(app)` layout supplies the navigation; this page renders only the
 * "coming soon" panel until the real surface is built.
 */
export default async function AssistantPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return <ComingSoon title={t.nav.aiAssistant} icon="ai-assistant" />;
}
