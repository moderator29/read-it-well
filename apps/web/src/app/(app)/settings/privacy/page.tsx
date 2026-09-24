import type { Metadata } from "next";
import { distinctDeviceCount } from "@/lib/security/device-count";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { DataCard, PrivacyCard, SecurityCard } from "@/components/app/account/SettingsGroups";
import { loadSettingsState } from "@/lib/profile/queries";
import { loadSessions } from "@/lib/security/sessions";
import { AccountPrivacyCard } from "../AccountToggles";
import { DevicesRow } from "../DevicesCard";
import { DataExportCard } from "../DataExportCard";
import { loadMoneyHoldUntil, loadPendingAddressMove } from "@/lib/auth/pending-address-move";
import { PendingAddressMove } from "./PendingAddressMove";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).settings.hub.privacy };
}

/**
 * Privacy & Security: what other people can see, where you are signed in, and
 * what is held about you. Three groups that were three cards on the old home.
 */
export default async function PrivacySettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const [account, sessions, pendingMove, moneyHoldUntil] = await Promise.all([
    loadSettingsState(),
    loadSessions(),
    loadPendingAddressMove(locale),
    loadMoneyHoldUntil(locale),
  ]);
  const signedIn = account.state === "signed-in";
  const deviceCount =
    sessions.state === "signed-in" && sessions.readable ? distinctDeviceCount(sessions.sessions) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t.settings.hub.privacy}
        subtitle={t.settings.hub.privacySub}
        fallback="/settings"
      />
      <div className="space-y-block">
        {moneyHoldUntil && (
          <section id="settings-money-hold" className="scroll-mt-28">
            <div role="status" className="nf-panel nf-panel--card grid gap-sm p-card">
              <h2 className="font-semibold">{t.settings.moneyHold.title.replace("{when}", moneyHoldUntil)}</h2>
              <p className="text-[length:var(--nf-text-body-sm)]">{t.settings.moneyHold.body}</p>
            </div>
          </section>
        )}
        {pendingMove && (
          <section id="settings-address-move" className="scroll-mt-28">
            <PendingAddressMove t={t} move={pendingMove} />
          </section>
        )}
        <section id="settings-privacy" className="scroll-mt-28">
          {signedIn ? (
            <AccountPrivacyCard
              t={t}
              initialPrivacy={account.settings.privacy}
              initialDataSaver={account.settings.dataSaver}
            />
          ) : (
            <PrivacyCard t={t} />
          )}
        </section>
        <section id="settings-security" className="scroll-mt-28">
          <SecurityCard t={t}>
            <DevicesRow t={t} signedIn={signedIn} count={deviceCount} />
          </SecurityCard>
        </section>
        <section id="settings-data" className="scroll-mt-28">
          <DataCard t={t} />
        </section>
        <section id="settings-data-export" className="scroll-mt-28">
          <DataExportCard t={t} signedIn={signedIn} />
        </section>
      </div>
    </div>
  );
}
