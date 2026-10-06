import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { Unreachable } from "@/components/app/Unreachable";
import { loadNotificationView } from "./load";
import { NotificationFullView } from "./NotificationFullView";
import { MarkReadOnOpen } from "./MarkReadOnOpen";

/**
 * One notification, in full: `/notifications/[id]`.
 *
 * A route, not a sheet, so back goes to the centre and a push or an email can
 * deep-link straight here. The tab title never names the event: a notice is
 * private to its owner and a title is the part of a page that gets
 * screenshotted and restored months later.
 *
 * Rendered per request: it reads the caller's own rows under RLS and marks the
 * notice read on arrival.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Notification", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NotificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const locale = await getLocale();
  const copy = getDictionary(locale).experienceInbox;
  const v = copy.notificationView;
  const session = await resolveSession();

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={v.pageTitle} fallback="/notifications" />
      {children}
    </div>
  );

  if (session.state === "signed-out") {
    return shell(
      <EmptyState
        icon="bell-badge"
        title={v.signedOut.title}
        body={v.signedOut.body}
        action={<EmptyActions primary={{ label: v.signedOut.action, href: "/sign-in" }} />}
      />,
    );
  }
  if (session.state !== "signed-in") {
    return shell(<Unreachable noun="notification" icon="bell-badge" action={{ label: v.unreachable.action, href: `/notifications/${id}` }} />);
  }

  const view = await loadNotificationView(session.supabase, id);
  if (view.state === "error") {
    return shell(<Unreachable noun="notification" icon="bell-badge" action={{ label: v.unreachable.action, href: `/notifications/${id}` }} />);
  }
  if (view.state === "missing") {
    return shell(
      <EmptyState
        icon="bell-badge"
        title={v.notFound.title}
        body={v.notFound.body}
        action={<EmptyActions primary={{ label: v.backToList, href: "/notifications" }} />}
      />,
    );
  }

  return shell(
    <>
      <MarkReadOnOpen id={view.row.id} unread={view.row.read_at === null} />
      <NotificationFullView row={view.row} before={view.before} after={view.after} copy={copy} locale={locale} />
    </>,
  );
}
