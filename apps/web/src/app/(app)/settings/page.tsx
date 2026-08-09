import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import {
  AppearanceCard,
  LanguageRow,
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

export async function generateMetadata(): Promise<Metadata> {
  // Static metadata cannot read the locale cookie, so the tab said "Settings"
  // to a Hausa reader whose whole screen was in Hausa.
  return { title: getDictionary(await getLocale()).nav.settings };
}

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

      <div className="space-y-block">
        <Reveal>
          {/* Language is a ROW of this group now, not a card of its own. A
              labelled glass surface wrapped around one select is a container
              that has not earned its border, and this screen was stacking
              eleven of them. See `AppearanceCard`. */}
          <AppearanceCard t={t}>
            <LanguageRow t={t} current={locale} />
          </AppearanceCard>
        </Reveal>
        <Reveal delay={60}>
          <PlaceCard
            t={t}
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
            <AccountNotificationsCard t={t} initial={account.settings.notifications} />
          ) : (
            <NotificationsCard t={t} />
          )}
        </Reveal>
        <Reveal delay={120}>
          {signedIn ? (
            <AccountPrivacyCard
              t={t}
              initialPrivacy={account.settings.privacy}
              initialDataSaver={account.settings.dataSaver}
            />
          ) : (
            <PrivacyCard t={t} />
          )}
        </Reveal>
        <Reveal delay={160}>
          <SearchCard t={t} />
        </Reveal>
        <Reveal delay={200}>
          <SecurityCard t={t} />
        </Reveal>
        <Reveal delay={240}>
          <DataCard t={t} />
        </Reveal>
        <Reveal delay={280}>
          <AccountSection
            t={t}
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
            <SettingsGroup label={t.settings.about.label} note={t.settings.about.note}>
              <RowLink
                href="/help"
                icon="ticket"
                label={t.settings.about.help}
                sub={t.settings.about.helpSub}
              />
              <RowLink href="/terms" icon="grid" label={t.settings.about.terms} />
              <RowLink href="/privacy" icon="verified" label={t.settings.about.privacy} />
              <RowValue icon="sparkle" label={t.settings.about.version} value="0.1.0" />
              {/* The library names are the products' own names and are not
                  translated, in any language. */}
              <RowValue
                icon="share"
                label={t.settings.about.licences}
                value="Next.js, React, Tailwind CSS (MIT)"
              />
            </SettingsGroup>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
