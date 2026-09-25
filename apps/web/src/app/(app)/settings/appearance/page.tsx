import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { AppearanceCard, LanguageRow } from "@/components/app/account/SettingsGroups";
import { SettingsGroup } from "@/components/app/account/rows";
import { ThemeControl } from "@/components/site/ThemeControl";

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
      {/* THE THEME, first (light mode reintroduced 25 September 2026). The
          same control as the foot of the side navigation, so the choice made
          in either place is the choice shown in both. */}
      <section id="settings-theme" className="mb-block">
        <SettingsGroup label={t.settings.appearance.theme} note="Dark is the default. System follows your phone.">
          <div className="px-md py-sm">
            <ThemeControl
              labels={{
                group: t.settings.appearance.theme,
                light: t.settings.appearance.themeLight,
                dark: t.settings.appearance.themeDark,
                system: t.settings.appearance.themeSystem,
              }}
            />
          </div>
        </SettingsGroup>
      </section>
      <section id="settings-appearance" className="scroll-mt-28">
        <AppearanceCard t={t}>
          <LanguageRow t={t} current={locale} />
        </AppearanceCard>
      </section>
    </div>
  );
}
