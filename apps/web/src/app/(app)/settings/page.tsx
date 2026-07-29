import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import {
  AppearanceCard,
  LanguageCard,
  NotificationsCard,
  PrivacyCard,
  SearchCard,
  SecurityCard,
  DataCard,
} from "@/components/app/account/SettingsGroups";
import { SupportChat } from "@/components/app/account/SupportChat";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings.
 *
 * Every preference in one place, grouped the way people look for them:
 * appearance (theme, text size, motion), language, notifications across four
 * channels, privacy, search defaults, security, data controls, help and
 * support with the assistant, then the about block. Everything applies
 * instantly and persists on this device; anything that cannot act yet says
 * so in plain words instead of pretending.
 */
export default async function SettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.settings} />

      <div className="space-y-4">
        <Reveal>
          <AppearanceCard />
        </Reveal>
        <Reveal delay={40}>
          <LanguageCard current={locale} />
        </Reveal>
        <Reveal delay={80}>
          <NotificationsCard />
        </Reveal>
        <Reveal delay={120}>
          <PrivacyCard />
        </Reveal>
        <Reveal delay={160}>
          <SearchCard />
        </Reveal>
        <Reveal delay={200}>
          <SecurityCard />
        </Reveal>
        <Reveal delay={240}>
          <DataCard />
        </Reveal>
        <Reveal delay={280}>
          <SupportChat />
        </Reveal>

        <Reveal delay={320}>
          <section id="legal" className="nf-card p-5 sm:p-6">
            <h2 className="nf-overline">About</h2>
            <dl className="mt-3 space-y-2 text-[0.875rem]">
              <div className="flex justify-between">
                <dt className="text-[var(--nf-content-muted)]">Version</dt>
                <dd className="nf-numeric">0.1.0</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--nf-content-muted)]">Open source licences</dt>
                <dd className="text-right">Next.js, React, Tailwind CSS (MIT)</dd>
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
