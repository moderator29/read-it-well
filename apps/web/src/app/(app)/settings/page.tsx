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
import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import {
  SETTINGS_SEARCH_COPY,
  matchSettings,
  settingsSections,
} from "@/components/app/account/settings-search";
import { loadSettingsState } from "@/lib/profile/queries";
import { AccountNotificationsCard, AccountPrivacyCard } from "./AccountToggles";
import { AccountSection } from "./AccountSection";
import { PlaceCard } from "./PlaceCard";
import { InterestsRow } from "./InterestsCard";
import { DevicesRow } from "./DevicesCard";
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
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
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
   * A WAY TO JUMP, AND A WAY TO FIND, ON A SCREEN FOUR THOUSAND PIXELS TALL.
   *
   * Measured at 4,143px of document height at 390px: twelve stacked cards and
   * nothing but a thumb to get between them. This is the screen a person opens
   * when something is already wrong, and the answer they came for was thirty
   * flicks down.
   *
   * THE SEARCH IS A PLAIN GET, not a client filter. The answer belongs in the
   * address: a narrowed settings screen is then a link somebody can send to the
   * person they are helping over the phone, the back button walks the narrowing
   * backwards, a reload lands on the same rows, and it costs no JavaScript to
   * type on a connection where a bundle is the difference between working and
   * waiting. It is the same contract `/u` and the console's queue frame already
   * run on.
   *
   * The index it matches against is built in
   * `components/app/account/settings-search.ts` out of the dictionary blocks
   * the sections are already rendering from, so there is no second copy of any
   * label to go stale. That file carries the argument.
   *
   * THE CHIPS ARE THE SAME LIST, NARROWED. They were the whole answer before
   * the search existed and they are still the faster one for somebody who knows
   * what they want; under a query they become the result list. They wrap rather
   * than scrolling sideways, so every destination is on screen at 390px at
   * once, which is the fault F2-063 files against the console's phone rail.
   *
   * Plain fragment anchors, so a jump costs no JavaScript either and can be
   * sent as a link that lands where it says.
   */
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const searchQuery = (rawQuery ?? "").trim();
  const sections = settingsSections(t);
  const matching = matchSettings(sections, searchQuery);
  const searching = searchQuery.length > 0;
  /* Set lookup rather than `.some()` per section: twelve is small enough that
     it makes no odds, and it keeps the render loop below reading as one test
     per section rather than a nested scan. */
  const shown = new Set(matching.map((entry) => entry.id));
  const show = (id: string): boolean => shown.has(id);

  /*
   * THE STAGGER GOES WHILE A SEARCH IS ON, and this is a fault the search
   * itself introduced.
   *
   * The twelve sections fade in on a ladder of delays up to 360ms, which is
   * right when twelve of them arrive in order down a long page. Under a query
   * it is not: the delays are keyed to a section's position in the FULL list,
   * so a search matching only About left the reader looking at an empty screen
   * for a third of a second before its one result appeared. A person who has
   * just typed a word is waiting on an answer, not watching an entrance.
   *
   * Zero rather than a shorter ladder, because the ladder's whole argument is
   * that things arrive in the order the eye reads them, and a filtered list has
   * no such order to express.
   */
  const stagger = (ms: number): number => (searching ? 0 : ms);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.settings} />

      <form method="get" action="/settings" className="mb-row" role="search">
        <label className="block">
          {/* The box's own name, not the screen's. "Settings" would tell a
              screen-reader user they are on a search field called the same
              thing as the page and the jump list beside it. */}
          <span className="sr-only">{SETTINGS_SEARCH_COPY.placeholder}</span>
          <input
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder={SETTINGS_SEARCH_COPY.placeholder}
            className="nf-field w-full"
            data-testid="settings-search"
          />
        </label>
      </form>

      {matching.length > 0 && (
        <nav aria-label={t.nav.settings} className="mb-block flex flex-wrap gap-inline">
          {matching.map((entry) => (
            <Chip key={entry.id} behaviour="link" href={`#${entry.id}`} size="sm">
              {entry.label}
            </Chip>
          ))}
        </nav>
      )}

      {searching && matching.length === 0 && (
        /* No section matched. Not a shrug: it says what was searched, that
           nothing has been changed by searching, and gives one tap back to the
           whole screen. */
        <EmptyState
          icon="home-search"
          title={SETTINGS_SEARCH_COPY.noMatchTitle}
          body={SETTINGS_SEARCH_COPY.noMatchBody}
          action={
            <EmptyActions primary={{ label: SETTINGS_SEARCH_COPY.clear, href: "/settings" }} />
          }
          data-testid="settings-no-match"
        />
      )}

      <div className="space-y-block">
        {/* Every section carries an id and a scroll margin, so a jump lands the
            heading clear of the app header rather than underneath it. */}
        {show("settings-appearance") && (
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
        )}
        {show("settings-place") && (
          <section id="settings-place" className="scroll-mt-28">
            <Reveal delay={stagger(60)}>
              {/* WHAT YOU CAME FOR IS A ROW OF THIS GROUP NOW, not a card of
                  its own. It was a labelled surface wrapped around one link,
                  which is the container F2-071 measures and the same argument
                  that folded Language into Appearance. The page's old comment
                  already said the two belonged together: where somebody is and
                  what they came for are the whole of what the platform knows
                  before they have searched for anything. */}
              <PlaceCard
                t={t}
                signedIn={signedIn}
                stateName={signedIn ? account.place.stateName : ""}
                lgaName={signedIn ? account.place.lgaName : ""}
                occupationName={signedIn ? account.place.occupationName : ""}
              >
                <InterestsRow
                  t={t}
                  signedIn={signedIn}
                  interests={intent.state === "signed-in" ? intent.interests : []}
                  asked={intent.state === "signed-in" ? intent.asked : false}
                />
              </PlaceCard>
            </Reveal>
          </section>
        )}
        {show("settings-notifications") && (
          <section id="settings-notifications" className="scroll-mt-28">
            <Reveal delay={stagger(80)}>
              {signedIn ? (
                <AccountNotificationsCard t={t} initial={account.settings.notifications} />
              ) : (
                <NotificationsCard t={t} />
            )}
          </Reveal>
        </section>
        )}
        {show("settings-privacy") && (
          <section id="settings-privacy" className="scroll-mt-28">
            <Reveal delay={stagger(120)}>
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
        )}
        {show("settings-search") && (
          <section id="settings-search" className="scroll-mt-28">
            <Reveal delay={stagger(160)}>
              <SearchCard t={t} />
            </Reveal>
          </section>
        )}
        {show("settings-security") && (
          <section id="settings-security" className="scroll-mt-28">
            <Reveal delay={stagger(200)}>
              {/* WHERE YOU ARE SIGNED IN IS A ROW OF THIS GROUP NOW. It was a
                  118px card holding one link and its own heading, which F2-071
                  names as the clearest example of what makes this screen four
                  thousand pixels tall. The page's old comment already argued
                  the relationship: it is the half of security this screen did
                  not have. `SecurityCard` still draws "Sign out everywhere" as
                  a note explaining it will work one day; this row is the one
                  that does. SEC-5. */}
              <SecurityCard t={t}>
                <DevicesRow t={t} signedIn={signedIn} count={deviceCount} />
              </SecurityCard>
            </Reveal>
          </section>
        )}
        {show("settings-data") && (
          <section id="settings-data" className="scroll-mt-28">
            <Reveal delay={stagger(240)}>
              <DataCard t={t} />
            </Reveal>
          </section>
        )}
        {show("settings-account") && (
          <section id="settings-account" className="scroll-mt-28">
            <Reveal delay={stagger(280)}>
              <AccountSection
                t={t}
                state={account.state}
                email={account.state === "signed-in" ? account.email : ""}
              />
            </Reveal>
          </section>
        )}
        {show("settings-help") && (
          <section id="settings-help" className="scroll-mt-28">
            <Reveal delay={stagger(320)}>
              <SupportChat />
            </Reveal>
          </section>
        )}

        {show("settings-about") && (
          <section id="settings-about" className="scroll-mt-28">
            <Reveal delay={stagger(360)}>
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
        )}
      </div>
    </div>
  );
}
