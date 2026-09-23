import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { NotificationsCard } from "@/components/app/account/SettingsGroups";
import { loadSettingsState } from "@/lib/profile/queries";
import { PushDevices, type PushDeviceView } from "@/components/app/push/PushDevices";
import { PushSetting } from "@/components/app/push/PushSetting";
import { deviceName, loadPushDevices, whenPhrase } from "@/lib/push/devices";
import { AccountNotificationsCard } from "../AccountToggles";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).settings.notifications.label };
}

/**
 * NEVER CACHED, and on this screen that is a correctness property rather than
 * a freshness one. A list of devices served from a cache is a list of devices
 * that could be reached at some point in the past, shown to somebody deciding
 * right now whether to turn one off.
 */
export const dynamic = "force-dynamic";

/**
 * Notifications, channel by channel, and the phones they reach.
 *
 * ===========================================================================
 * TWO THINGS ARE MOUNTED HERE THAT WERE NOT BEFORE, AND THE SECOND IS THE ONE
 * THAT MATTERS.
 *
 * `PushSetting` is the one place asking about notifications is not an
 * interruption, because the person came here to ask us.
 *
 * `PushDevices` is what makes the permission reversible. WITHOUT A DEVICE
 * LIST, PUSH IS SOMETHING A PERSON CAN GRANT AND CANNOT TAKE BACK except by
 * uninstalling Vallo, which is not a setting, it is an ultimatum.
 *
 * Both are below the existing channel toggles rather than above them. The
 * toggles are what a person came for; the devices are the fine print of a
 * decision they have already made.
 *
 * ===========================================================================
 * THE ROWS ARE FORMATTED HERE, IN THE SERVER COMPONENT.
 *
 * The client component holds no copy of the device data, so there is no path
 * by which the screen shows a device that is no longer live: the actions call
 * `revalidatePath` and this re-renders from the database. Nothing that leaves
 * this file carries a push token. See `lib/push/devices.ts` for what is
 * selected and, more to the point, what is not.
 *
 * SIGNED OUT, THE PUSH BLOCK IS NOT DRAWN AT ALL. A device list belongs to an
 * account, and a stranger on a shared handset has no account here yet. The
 * channel toggles above still work: they fall back to the device document,
 * which is the existing behaviour and is not changed.
 */
export default async function NotificationsSettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const account = await loadSettingsState();
  const push = await loadPushDevices();

  const rows: PushDeviceView[] =
    push.state === "signed-in"
      ? push.devices.map((row) => ({
          id: row.id,
          name: deviceName(row),
          ref: row.ref,
          lastSeen: whenPhrase(row.lastSeen),
          firstSeen: whenPhrase(row.firstSeen),
        }))
      : [];

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

      {push.state === "signed-in" && (
        <section id="settings-push" className="mt-block scroll-mt-28 space-y-block">
          <h2 className="nf-title-sm text-content">On your phone</h2>
          <PushSetting />
          <PushDevices rows={rows} readable={push.readable} />
        </section>
      )}
    </div>
  );
}
