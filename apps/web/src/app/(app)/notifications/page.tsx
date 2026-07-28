import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { NotificationsList } from "@/components/app/NotificationsList";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = { title: "Notifications" };

/**
 * Notifications.
 *
 * Thin server shell; the client list owns filters, read state and mark-all.
 */
export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" />
      <Reveal>
        <NotificationsList />
      </Reveal>
    </div>
  );
}
