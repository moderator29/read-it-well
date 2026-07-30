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
import { loadSettingsState } from "@/lib/profile/queries";
import { AccountNotificationsCard, AccountPrivacyCard } from "./AccountToggles";
import { AccountSection } from "./AccountSection";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings.
 *
 * Every preference in one place, grouped the way people look for them:
 * appearance (theme, text size, motion), language, notifications, privacy,
 * search defaults, security, data controls, the account block, help and
 * support with the assistant, then the about block.
 *
 * Two worlds, one screen. Signed in on a configured platform, the
 * notification and privacy groups write to profiles.settings under row level
 * security, so the choice follows the person to every device they use. Signed
 * out, or before the platform keys land, those same groups are the on-device
 * cards this page has always shown, storing to nf_settings exactly as before.
 * Appearance, language and search stay on the device either way: a theme
 * belongs to a screen, not to an account.
 */
export default async function SettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const account = await loadSettingsState();
  const signedIn = account.state === "signed-in";

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
          {signedIn ? (
            <AccountNotificationsCard initial={account.settings.notifications} />
          ) : (
            <NotificationsCard />
          )}
        </Reveal>
        <Reveal delay={120}>
          {signedIn ? (
            <AccountPrivacyCard
              initialPrivacy={account.settings.privacy}
              initialDataSaver={account.settings.dataSaver}
            />
          ) : (
            <PrivacyCard />
          )}
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
          <AccountSection
            state={account.state}
            email={account.state === "signed-in" ? account.email : ""}
          />
        </Reveal>
        <Reveal delay={320}>
          <SupportChat />
        </Reveal>

        <Reveal delay={360}>
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
              RentMe respects your privacy: preferences kept on this device stay
              on this device, account preferences are protected with row level
              security, and only you can read or change your own row. Full terms
              and the privacy policy publish with the launch release.
            </p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
