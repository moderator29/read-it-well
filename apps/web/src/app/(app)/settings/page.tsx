import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { PaymentMethodsSlot } from "@/components/app/account/PaymentMethodsSlot";
import {
  SETTINGS_SEARCH_COPY,
  matchSettings,
  settingsSections,
} from "@/components/app/account/settings-search";
import { loadProfileState } from "@/lib/profile/queries";
import { loadSessions } from "@/lib/security/sessions";
import { getAgentContext } from "@/lib/agent/listings-queries";
import { LogOutRow, SettingsHub } from "./SettingsHub";

export async function generateMetadata(): Promise<Metadata> {
  // Static metadata cannot read the locale cookie, so the tab said "Settings"
  // to a Hausa reader whose whole screen was in Hausa.
  return { title: getDictionary(await getLocale()).nav.settings };
}

/**
 * Settings, the home, to `7F96BE6C`.
 *
 * The headline and its line, the profile row, the six hub rows, the payment
 * methods block, Log Out. It used to be every preference on one screen, four
 * thousand pixels of it; the preferences are all still here, one tap down,
 * grouped under the row that names them: `/settings/account`,
 * `/settings/notifications`, `/settings/privacy`, `/settings/appearance` and
 * `/settings/help`. The search stays: a plain GET whose answers are now links
 * to those screens rather than jumps down this one.
 *
 * Two worlds, one screen. Signed in on a configured platform the hub's switch
 * writes `profiles.settings` under row level security; signed out, or before
 * the platform keys land, it writes the device document, exactly as before.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const [account, sessions, agentContext, params] = await Promise.all([
    loadProfileState(),
    loadSessions(),
    getAgentContext(),
    searchParams,
  ]);
  const signedIn = account.state === "signed-in";
  const profile = signedIn ? account.profile : null;

  /* Null, not zero, when the list could not be read. A row reading "0
     devices" to somebody reading it while signed in is a worse lie than no
     number at all. */
  const deviceCount =
    sessions.state === "signed-in" && sessions.readable ? sessions.sessions.length : null;

  /* "Verified" means a human was checked, and the one record of that on this
     platform is an APPROVED, verified agent. Nobody else gets the word. */
  const verified = agentContext.state === "agent" && agentContext.agent.verified;

  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const searchQuery = (rawQuery ?? "").trim();
  const matching = matchSettings(settingsSections(t), searchQuery);
  const searching = searchQuery.length > 0;

  const hub = t.settings.hub;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="nf-hub-head">
        <h1 className="nf-hub-head__title">{t.nav.settings}</h1>
        <p className="nf-hub-head__lede">{hub.lede}</p>
      </header>

      <form method="get" action="/settings" className="mb-row" role="search">
        <label className="block">
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

      {searching && matching.length > 0 && (
        <nav aria-label={t.nav.settings} className="mb-block flex flex-wrap gap-inline">
          {matching.map((entry) => (
            <Chip key={entry.id} behaviour="link" href={entry.href} size="sm">
              {entry.label}
            </Chip>
          ))}
        </nav>
      )}

      {searching && matching.length === 0 && (
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
        <SettingsHub
          t={t}
          locale={locale}
          signedIn={signedIn}
          person={
            profile
              ? {
                  name:
                    profile.displayName ||
                    [profile.firstName, profile.surname].filter(Boolean).join(" "),
                  email: profile.email,
                  avatarUrl: profile.avatarUrl,
                  verified,
                }
              : null
          }
          notifications={profile ? profile.settings.notifications : null}
          deviceCount={deviceCount}
        />

        {/* Worker E fills this slot from `components/app/payments`; see
            `PaymentMethodsSlot`. Signed out there are no methods to show. */}
        {signedIn ? (
          <PaymentMethodsSlot
            title={hub.payments}
            sub={hub.paymentsSub}
            addLabel={hub.add}
            manageLabel={t.paymentsPage.settingsRow}
          />
        ) : null}

        <LogOutRow t={t} signedIn={signedIn} />
      </div>
    </div>
  );
}
