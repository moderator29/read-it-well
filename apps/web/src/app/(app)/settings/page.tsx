import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import {
  AppearanceCard,
  LanguageCard,
  NotificationsCard,
  AccountCard,
} from "@/components/app/account/SettingsGroups";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings.
 *
 * Grouped working controls: appearance and motion, the live language switch
 * (writes the locale cookie the server reads, then refreshes the tree),
 * notification preferences, and the expanding account panels. Preferences
 * persist on this device until real accounts land.
 */
export default async function SettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.settings} />

      <div className="space-y-4">
        <Reveal>
          <LanguageCard current={locale} />
        </Reveal>
        <Reveal delay={60}>
          <AppearanceCard />
        </Reveal>
        <Reveal delay={120}>
          <NotificationsCard />
        </Reveal>
        <Reveal delay={180}>
          <AccountCard />
        </Reveal>

        <Reveal delay={240}>
          <section id="legal" className="nf-card p-5">
            <h2 className="nf-overline">About</h2>
            <dl className="mt-3 space-y-2 text-[0.875rem]">
              <div className="flex justify-between">
                <dt className="text-[var(--nf-content-muted)]">Version</dt>
                <dd className="nf-numeric">0.1.0</dd>
              </div>
            </dl>
            <p className="mt-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              NaijaFinds respects your privacy: preferences on this page stay on
              your device, and account data is protected with row level security
              once you sign in. Full terms and the privacy policy publish with
              the launch release.
            </p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
