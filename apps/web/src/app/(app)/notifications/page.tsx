import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { Unreachable } from "@/components/app/Unreachable";
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
          <Unreachable
            noun="notifications"
            icon="bell-badge"
            action={{ label: "Try again", href: "/notifications" }}
          />
        </Reveal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" />
      <Reveal>
        {/* One empty state, one action treatment. This was a `MomentScreen`
            with two hand-written `nf-btn` anchors at intrinsic width, beside a
            sibling branch whose single action was full width. A confirmation
            component was doing an empty state's job, which is the reason there
            were nine of them. */}
        <EmptyState
          icon="bell-badge"
          title="Sign in to see your notifications"
          body="Your bookings, messages and wallet activity are tied to your account, so we only ever show you your own. Nothing here belongs to anyone else."
          action={
            <EmptyActions
              primary={{ label: "Sign in", href: "/sign-in" }}
              /* "Keep exploring" pointed at /search, which is the product
                 changing the subject when it cannot answer the question, and it
                 is the same non sequitur "Explore places" was on the wallet.
                 The quiet action belongs to the screen it is on: the one thing
                 somebody can genuinely do here without an account is decide
                 what they want to be told about, and the on-device
                 notifications card does that signed out. */
              secondary={{
                label: "Notification settings",
                href: "/settings#settings-notifications",
              }}
            />
          }
        />
      </Reveal>
    </div>
  );
}
