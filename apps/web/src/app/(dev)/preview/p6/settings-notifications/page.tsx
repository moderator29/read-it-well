import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { NotificationMatrix } from "@/app/(app)/settings/notifications/NotificationMatrix";
import { SETTINGS_DEFAULTS } from "@/lib/profile/model";
import "@/app/(app)/settings/settings-physical.css";

/**
 * The signed-in notification settings (P6): the event by channel matrix with
 * the defaults a new member has, and quiet hours. A toggle here calls the real
 * action, which refuses without a session, so nothing is written.
 */
export default function PreviewP6SettingsNotifications() {
  const t = getDictionary("en");
  return (
    <main id="main" className="min-h-dvh pb-4xl">
      <div className="nf-shell py-section-tight">
        <div className="nf-settings-physical mx-auto max-w-2xl">
          <PageHeader title={t.settings.notifications.label} subtitle={t.settings.hub.notificationsSub} fallback="/settings" />
          <NotificationMatrix initial={SETTINGS_DEFAULTS.notifications} copy={t.experienceSettings.notifications} />
        </div>
      </div>
    </main>
  );
}
