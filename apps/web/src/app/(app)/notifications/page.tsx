import type { Metadata } from "next";
import Link from "next/link";
import { MomentScreen } from "@/components/app/MomentScreen";
import { PageHeader } from "@/components/app/PageHeader";
import { resolveSession } from "@/lib/actions/session";
import { loadNotifications } from "@/lib/messages/live";
import { Reveal } from "@/components/site/Reveal";
import { LiveNotifications, type NotificationItem } from "./LiveNotifications";

export const metadata: Metadata = { title: "Notifications" };

/**
 * Notifications.
 *
 * Signed in on a configured platform, the inbox is the caller's real rows under
 * RLS, day-grouped, with realtime arrivals and read state persisted through the
 * read_at column grant.
 *
 * The other two states used to render a hardcoded list of five invented
 * notifications, unlabelled, to anyone at all: a visitor who had never booked
 * anything was told "Booking confirmed, Lekki Palm Grove Shortlet is locked in"
 * and "Your wallet is ready". That is the exact thing owner rules 13 and 22
 * forbid, on a surface whose entire value is that it can be believed. Both are
 * now honest, designed screens with a way onward.
 *
 * Deleting the seeded list also removed the "Offers" filter chip, which no
 * notification kind could ever match (docs/DEAD_ENDS.md M3, first half).
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

    /* The header belongs to the client component here, because the mark-all
       control has to sit in it and only that component knows what is unread. */
    return (
      <div className="mx-auto max-w-2xl">
        <LiveNotifications initial={initial} userId={session.user.id} />
      </div>
    );
  }

  if (session.state === "unconfigured") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Notifications" />
        <Reveal>
          <MomentScreen
            variant="brand"
            icon="bell-badge"
            title="Notifications switch on shortly"
            description="Bookings, messages and wallet activity will land here the moment the platform keys are in place. Nothing is waiting for you yet."
            actions={
              <Link href="/search" className="nf-btn nf-btn--primary nf-btn--lg">
                Explore places
              </Link>
            }
          />
        </Reveal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" />
      <Reveal>
        <MomentScreen
          variant="brand"
          icon="bell-alert"
          title="Sign in to see your notifications"
          description="Your bookings, messages and wallet activity are tied to your account, so we only ever show you your own. Nothing here belongs to anyone else."
          actions={
            <>
              <Link href="/sign-in" className="nf-btn nf-btn--primary nf-btn--lg">
                Sign in
              </Link>
              <Link href="/search" className="nf-btn nf-btn--glass nf-btn--lg">
                Keep exploring
              </Link>
            </>
          }
        />
      </Reveal>
    </div>
  );
}
