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
import { RowLink, RowValue, SettingsGroup } from "@/components/app/account/rows";
import { SupportChat } from "@/components/app/account/SupportChat";
import { Reveal } from "@/components/site/Reveal";
import { loadSettingsState } from "@/lib/profile/queries";
import { AccountNotificationsCard, AccountPrivacyCard } from "./AccountToggles";
import { AccountSection } from "./AccountSection";
import { PlaceCard } from "./PlaceCard";
import { InterestsCard } from "./InterestsCard";
import { loadInterestsState } from "@/lib/interests/queries";

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
  const [account, intent] = await Promise.all([loadSettingsState(), loadInterestsState()]);
  const signedIn = account.state === "signed-in";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.settings} />

      <div className="space-y-6">
        <Reveal>
          <AppearanceCard />
        </Reveal>
        <Reveal delay={40}>
          <LanguageCard current={locale} />
        </Reveal>
        <Reveal delay={60}>
          <PlaceCard
            signedIn={signedIn}
            stateName={signedIn ? account.place.stateName : ""}
            lgaName={signedIn ? account.place.lgaName : ""}
            occupationName={signedIn ? account.place.occupationName : ""}
          />
        </Reveal>
        <Reveal delay={70}>
          {/* Directly under where-you-are, because the two together are the
              whole of what the platform knows about somebody before they have
              searched for anything: where they are and what they came for. */}
          <InterestsCard
            t={t}
            signedIn={signedIn}
            interests={intent.state === "signed-in" ? intent.interests : []}
            asked={intent.state === "signed-in" ? intent.asked : false}
          />
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
          {/* About used to end on "full terms and the privacy policy publish
              with the launch release". Both have been live at /terms and
              /privacy for some time, so the sentence was telling somebody
              looking for their rights that the page did not exist. They are
              rows now, and they go there. */}
          <div id="legal">
            <SettingsGroup
              label="About"
              note="Preferences kept on this device stay on this device. Account preferences are protected with row level security, so only you can read or change your own row."
            >
              <RowLink
                href="/help"
                icon="ticket"
                label="Help"
                sub="Get an answer from a person"
              />
              <RowLink href="/terms" icon="grid" label="Terms" />
              <RowLink href="/privacy" icon="verified" label="Privacy policy" />
              <RowValue icon="sparkle" label="Version" value="0.1.0" />
              <RowValue
                icon="share"
                label="Open source licences"
                value="Next.js, React, Tailwind CSS (MIT)"
              />
            </SettingsGroup>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
