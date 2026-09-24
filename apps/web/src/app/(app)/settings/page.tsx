import type { Metadata } from "next";
import { distinctDeviceCount } from "@/lib/security/device-count";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { BackButton } from "@/components/site/BackButton";
import { PaymentMethodsBlock } from "@/components/app/payments/PaymentMethodsBlock";
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
 * `/settings/help`.
 *
 * The search field that sat under the headline is gone from this screen: the
 * render has none, and six rows do not need one. The account screen keeps
 * its search over the preferences it holds (`./account`).
 *
 * Two worlds, one screen. Signed in on a configured platform the hub's switch
 * writes `profiles.settings` under row level security; signed out, or before
 * the platform keys land, it writes the device document, exactly as before.
 */
export default async function SettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const [account, sessions, agentContext] = await Promise.all([
    loadProfileState(),
    loadSessions(),
    getAgentContext(),
  ]);
  const signedIn = account.state === "signed-in";
  const profile = signedIn ? account.profile : null;

  /* Null, not zero, when the list could not be read. A row reading "0
     devices" to somebody reading it while signed in is a worse lie than no
     number at all. */
  const deviceCount =
    sessions.state === "signed-in" && sessions.readable ? distinctDeviceCount(sessions.sessions) : null;

  /* "Verified" means a human was checked, and the one record of that on this
     platform is an APPROVED, verified agent. Nobody else gets the word. */
  const verified = agentContext.state === "agent" && agentContext.agent.verified;

  const hub = t.settings.hub;

  return (
    <div className="mx-auto max-w-2xl">
      {/*
        THE WAY BACK. `/settings` declares `/home` above it in
        `lib/nav/route-parents.ts`, every screen UNDER it draws a `PageHeader`
        with a back control, and the hub itself drew none: the one level of the
        settings tree with no way up was its top. `BackButton` rather than
        swapping the head for a `PageHeader`, because `nf-hub-head` is the
        render's own title and lede and a `PageHeader` would replace a designed
        head to add one control. It wears the shared glass square
        (`nf-icon-btn--glass`, as `PageHeader` does) because `7F96BE6C` draws
        the back arrow in one, where the component alone draws a bare arrow.
      */}
      <BackButton fallback="/home" className="nf-icon-btn nf-icon-btn--glass h-11 w-11" />
      <header className="nf-hub-head">
        <h1 className="nf-hub-head__title">{t.nav.settings}</h1>
        <p className="nf-hub-head__lede">{hub.ledeShort}</p>
      </header>

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

        {/* Worker E's block, on the real `listPaymentMethods` and
            `listBankAccounts` reads: the cards and bank accounts with Add,
            Default and Verified as the render draws them. It renders nothing
            signed out, because a block about somebody's cards has no honest
            signed-out form. */}
        <PaymentMethodsBlock />

        <LogOutRow t={t} signedIn={signedIn} />
      </div>
    </div>
  );
}
