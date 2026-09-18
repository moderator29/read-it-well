import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { AppearanceCard, LanguageRow } from "@/components/app/account/SettingsGroups";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).settings.appearance.label };
}

/**
 * Appearance: theme, text size, motion, data saver and the language, all held
 * on this device and applied to it.
 */
export default async function AppearanceSettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t.settings.appearance.label}
        subtitle={t.settings.hub.appearanceSub}
        fallback="/settings"
      />
      <section id="settings-appearance" className="scroll-mt-28">
        <AppearanceCard t={t}>
          <LanguageRow t={t} current={locale} />
        </AppearanceCard>
      </section>
    </div>
  );
}
