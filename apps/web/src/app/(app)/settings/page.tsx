import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
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
import { Chip } from "@/components/ui/Chip";
import { loadSettingsState } from "@/lib/profile/queries";
import { AccountNotificationsCard, AccountPrivacyCard } from "./AccountToggles";
import { AccountSection } from "./AccountSection";
import { PlaceCard } from "./PlaceCard";
import { InterestsCard } from "./InterestsCard";
import { DevicesCard } from "./DevicesCard";
import { loadInterestsState } from "@/lib/interests/queries";
import { loadSessions } from "@/lib/security/sessions";

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
  const [account, intent, sessions] = await Promise.all([
    loadSettingsState(),
    loadInterestsState(),
    loadSessions(),
  ]);
  const signedIn = account.state === "signed-in";
  /* Null, not zero, when the list could not be read. A row reading "0 signed
     in" to somebody who is reading it while signed in is a worse lie than no
     number at all. */
  const deviceCount =
    sessions.state === "signed-in" && sessions.readable ? sessions.sessions.length : null;

  /*
   * A WAY TO JUMP, ON A SCREEN THAT IS FOUR THOUSAND PIXELS TALL.
   *
   * Measured at 4,143px of document height at 390px: twelve stacked cards and
   * nothing but a thumb to get between them. This is the screen a person opens
   * when something is already wrong, and the answer they came for was thirty
   * flicks down. Both iOS and Android put a way through a settings list of this
   * length, and this one had none at all.
   *
   * WHAT WAS TRIED AND REJECTED. A search field, which is what F2-071 asks for
   * first and what those two platforms actually ship. It cannot be built
   * honestly from here: the twelve sections are twelve separate components,
   * several of them client components, and each keeps its own copy inside
   * itself, so a filter at the top of this page would have nothing to match
   * against short of hard-coding a second copy of every label and every row on
   * the screen. Two copies of the words is how one of them goes stale. Search
   * belongs with a real index of the rows, which is a bigger change than a
   * navigation fix earns.
   *
   * SO: THE LABELS THAT ALREADY EXIST, AS JUMP LINKS. Nothing is duplicated.
   * Every entry reads the same dictionary key its section's own heading reads,
   * so a renamed section renames its link, and a section with no key of its own
   * is not invented one.
   *
   * THEY WRAP, THEY DO NOT SCROLL SIDEWAYS. Twelve chips in a horizontal
   * scroller is the fault F2-063 files against the console's phone navigation,
   * and it would be the same fault here: a person cannot jump to a destination
   * they cannot see. Wrapped, all twelve are on screen at 390px.
   *
   * Plain fragment anchors, so this costs no JavaScript, survives a page with
   * scripting off, and can be sent to somebody as a link that lands where it
   * says.
   */
  const jumps: { id: string; label: string }[] = [
    { id: "settings-appearance", label: t.settings.appearance.label },
    { id: "settings-place", label: t.settings.place.label },
    { id: "settings-interests", label: t.interests.screenTitle },
    { id: "settings-notifications", label: t.settings.notifications.label },
    { id: "settings-privacy", label: t.settings.privacy.label },
    { id: "settings-search", label: t.settings.search.label },
    { id: "settings-security", label: t.settings.security.label },
    { id: "settings-devices", label: t.settings.devices.rowLabel },
    { id: "settings-data", label: t.settings.data.label },
    { id: "settings-account", label: t.settings.account.label },
    { id: "settings-help", label: t.settings.about.help },
    { id: "settings-about", label: t.settings.about.label },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.settings} />

      <nav aria-label={t.nav.settings} className="mb-block flex flex-wrap gap-inline">
        {jumps.map((jump) => (
          <Chip key={jump.id} behaviour="link" href={`#${jump.id}`} size="sm">
            {jump.label}
          </Chip>
        ))}
      </nav>

      <div className="space-y-block">
        {/* Every section carries an id and a scroll margin, so a jump lands the
            heading clear of the app header rather than underneath it. */}
        <section id="settings-appearance" className="scroll-mt-28">
          <Reveal>
            {/* Language is a ROW of this group now, not a card of its own. A
                labelled glass surface wrapped around one select is a container
                that has not earned its border, and this screen was stacking
                eleven of them. See `AppearanceCard`. */}
            <AppearanceCard t={t}>
              <LanguageRow t={t} current={locale} />
            </AppearanceCard>
          </Reveal>
        </section>
        <section id="settings-place" className="scroll-mt-28">
          <Reveal delay={60}>
            <PlaceCard
              t={t}
              signedIn={signedIn}
              stateName={signedIn ? account.place.stateName : ""}
              lgaName={signedIn ? account.place.lgaName : ""}
              occupationName={signedIn ? account.place.occupationName : ""}
            />
          </Reveal>
        </section>
        <section id="settings-interests" className="scroll-mt-28">
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
        </section>
        <section id="settings-notifications" className="scroll-mt-28">
          <Reveal delay={80}>
            {signedIn ? (
              <AccountNotificationsCard t={t} initial={account.settings.notifications} />
            ) : (
              <NotificationsCard t={t} />
            )}
          </Reveal>
        </section>
        <section id="settings-privacy" className="scroll-mt-28">
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
        </section>
        <section id="settings-search" className="scroll-mt-28">
          <Reveal delay={160}>
            <SearchCard t={t} />
          </Reveal>
        </section>
        <section id="settings-security" className="scroll-mt-28">
          <Reveal delay={200}>
            <SecurityCard t={t} />
          </Reveal>
        </section>
        {/* Directly under Security, because it is the half of security this
            screen did not have. `SecurityCard` still draws "Sign out
            everywhere" as a note that explains it will work one day; this row
            is the one that does. SEC-5. */}
        <section id="settings-devices" className="scroll-mt-28">
          <Reveal delay={220}>
            <DevicesCard t={t} signedIn={signedIn} count={deviceCount} />
          </Reveal>
        </section>
        <section id="settings-data" className="scroll-mt-28">
          <Reveal delay={240}>
            <DataCard t={t} />
          </Reveal>
        </section>
        <section id="settings-account" className="scroll-mt-28">
          <Reveal delay={280}>
            <AccountSection
              t={t}
              state={account.state}
              email={account.state === "signed-in" ? account.email : ""}
            />
          </Reveal>
        </section>
        <section id="settings-help" className="scroll-mt-28">
          <Reveal delay={320}>
            <SupportChat />
          </Reveal>
        </section>

        <section id="settings-about" className="scroll-mt-28">
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
        </section>
      </div>
    </div>
  );
}
