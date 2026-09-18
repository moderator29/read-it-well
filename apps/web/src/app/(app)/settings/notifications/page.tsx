import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { NotificationsCard } from "@/components/app/account/SettingsGroups";
import { loadSettingsState } from "@/lib/profile/queries";
import { AccountNotificationsCard } from "../AccountToggles";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).settings.notifications.label };
}

/**
 * Notifications, channel by channel. Signed in these write `profiles.settings`
 * under row level security; otherwise the device document.
 */
export default async function NotificationsSettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const account = await loadSettingsState();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t.settings.notifications.label}
        subtitle={t.settings.hub.notificationsSub}
        fallback="/settings"
      />
      <section id="settings-notifications" className="scroll-mt-28">
        {account.state === "signed-in" ? (
          <AccountNotificationsCard t={t} initial={account.settings.notifications} />
        ) : (
          <NotificationsCard t={t} />
        )}
      </section>
    </div>
  );
}
