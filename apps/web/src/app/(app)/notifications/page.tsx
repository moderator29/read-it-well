import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { NotificationsList } from "@/components/app/NotificationsList";
import { Reveal } from "@/components/site/Reveal";
import { resolveSession } from "@/lib/actions/session";
import { loadNotifications } from "@/lib/messages/live";
import { LiveNotifications, type NotificationItem } from "./LiveNotifications";

export const metadata: Metadata = { title: "Notifications" };

/**
 * Notifications.
 *
 * Signed in on a configured platform, the inbox is the caller's real rows
 * under RLS, day-grouped, with realtime arrivals and read state persisted
 * through the read_at column grant. Otherwise the seeded list carries the
 * surface with device-local read state, exactly as before.
 */
export default async function NotificationsPage() {
  const session = await resolveSession();

  if (session.state === "signed-in") {
    const rows = await loadNotifications(session.supabase);
    const initial: NotificationItem[] = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      href: r.href,
      read: r.read_at !== null,
      createdAt: r.created_at,
    }));

    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Notifications" />
        <LiveNotifications initial={initial} userId={session.user.id} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" />
      <Reveal>
        <NotificationsList />
      </Reveal>
    </div>
  );
}
