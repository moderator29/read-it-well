import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import NotificationsPage from "@/app/(app)/notifications/page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).nav.notifications, robots: { index: false, follow: false } };
}

/**
 * /host/notifications: the host bell's destination, inside the workspace.
 *
 * The consumer route's page rendered unchanged (the caller's own rows under
 * RLS, realtime arrivals, the read-state grant) in the host's frame, as
 * `/agent/notifications` does for the listings workspace, so reaching for
 * the bell never drops a host into the consumer shell. The list draws its
 * own `PageHeader` back control, so the bar draws none.
 */
export default function HostNotificationsPage() {
  return (
    <HostShell fallback="/host" chromeBack={false} nav>
      <NotificationsPage />
    </HostShell>
  );
}
