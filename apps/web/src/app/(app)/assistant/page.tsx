import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { ComingSoon, Ske } from "@/components/app/ComingSoon";
import { UiIcon } from "@/design-system/icons/UiIcon";

export const metadata: Metadata = { title: "AI Assistant" };

/**
 * AI Assistant destination.
 *
 * Reserved so the rail and tab bar never dead-end here (Master Rule 55). The
 * `(app)` layout supplies the navigation; this page shows what the surface
 * will be, with a mocked composer clearly badged as a preview.
 */
export default async function AssistantPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <ComingSoon
      title={t.nav.aiAssistant}
      icon="ai-assistant"
      promise="Ask for a stay in plain words and get real, bookable places back."
      preview={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="nf-chip">
              <UiIcon name="sparkle" size={14} />
              <span className="max-w-[16rem] truncate">{t.home.aiCard.samplePrompt}</span>
            </span>
            <span className="nf-chip">
              <UiIcon name="sparkle" size={14} />
              Weekend spots near me
            </span>
          </div>
          <div className="flex justify-end">
            <Ske className="h-9 w-2/5 rounded-2xl rounded-br-md" />
          </div>
          <div className="space-y-2">
            <Ske className="h-3.5 w-4/5" />
            <Ske className="h-3.5 w-3/5" />
          </div>
          <div className="flex items-center gap-2.5 rounded-full border border-[var(--nf-border-subtle)] px-4 py-3 text-[0.875rem] text-[var(--nf-content-muted)]">
            <UiIcon name="sparkle" size={16} className="shrink-0" />
            Ask NaijaFinds AI anything
          </div>
        </div>
      }
    />
  );
}
