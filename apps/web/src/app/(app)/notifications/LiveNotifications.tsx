"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./notifications.css";
import { PageHeader } from "@/components/app/PageHeader";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { markNotificationsRead } from "@/lib/messages/notifications-actions";
import { loadOlderNotifications } from "@/lib/notify/inbox-actions";
import { toNotificationItem, type NotificationItem } from "@/lib/notify/links";
import { lagosTimeLabel } from "@/lib/messages/time";
import {
  useNotificationsRealtime,
  type LiveNotificationRow,
} from "@/lib/messages/useRealtime";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, TYPE } from "@/components/app/Screen";

/**
 * The signed-in notifications inbox, in the home register.
 *
 * Server-loaded rows with realtime prepend for new arrivals. Reads are
 * optimistic: tapping an item or mark-all flips the local state instantly and
 * the action persists it; the read_at column grant means that is the only
 * field a client can ever change. A dropped socket costs nothing; the next
 * visit renders the database's truth.
 *
 * Two sections rather than a day per heading. New and Earlier is the split a
 * person actually works to: everything unread, then everything else, each with
 * its own count. Day headings looked tidy and answered a question nobody was
 * asking, which was "what did I already deal with, and on which Tuesday".
 *
 * THE ROWS ARE GLASS ROWS IN ONE CARD, with the kind's glyph on a tile at the
 * left, the way every list in the renders is drawn. Unread is said three
 * ways at once, the row's tint, the title's weight and the dot, so colour is
 * never the only signal; the tile lights with the row so the rail reads the
 * state at a glance.
 *
 * Every sentence on this screen was written by a database trigger. Follows,
 * replies, mentions, likes, reposts, badges and every moderation transition
 * all write public.notifications themselves, so this file is the surface and
 * never the source.
 */

export type { NotificationItem };

const KIND_ICON: Record<string, UiIconName> = {
  booking: "calendar-booking",
  message: "chat-bubble",
  wallet: "wallet",
  listing: "house",
  agent: "key",
  support: "user",
  system: "bell",
  /* Everything Around sends: a new follower, a reply, a mention, a like, a
     repost, a badge, and every moderation decision. One icon for all of them
     because they share one thing, which is that another person is on the other
     end of it. */
  social: "user",
};

function iconFor(kind: string): UiIconName {
  return KIND_ICON[kind] ?? "bell";
}

export function LiveNotifications({
  initial,
  initialMore = false,
  userId,
}: {
  initial: NotificationItem[];
  /** True when the server read stopped at a page and older rows exist. */
  initialMore?: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [more, setMore] = useState(initialMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useNotificationsRealtime(userId, (row: LiveNotificationRow) => {
    setItems((prev) => {
      if (prev.some((n) => n.id === row.id)) return prev;
      return [toNotificationItem(row), ...prev];
    });
  });

  /*
   * Reads are optimistic, and a read that did not persist is put back.
   * Without the revert, a failed write left the row looking read on this
   * screen while the bell (a server count) went on counting it, and the two
   * disagreed until the next visit. On success the route is refreshed, which
   * re-renders the shell's server-side unread count, so the bell and this
   * list agree at once rather than on the next navigation.
   */
  const markOne = useCallback(
    (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      void markNotificationsRead({ ids: [id] }).then((result) => {
        if (result.ok) {
          router.refresh();
          return;
        }
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
      });
    },
    [router],
  );

  const markAll = useCallback(() => {
    const before = items;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setProblem(null);
    void markNotificationsRead({}).then((result) => {
      if (result.ok) {
        router.refresh();
        return;
      }
      /* Only the rows this press marked go back; anything that arrived
         over realtime in the meantime keeps its own state. */
      const unread = new Set(before.filter((n) => !n.read).map((n) => n.id));
      setItems((prev) => prev.map((n) => (unread.has(n.id) ? { ...n, read: false } : n)));
      setProblem(result.error);
    });
  }, [items, router]);

  /* Older rows, a page at a time, after the last row on screen. */
  const showOlder = useCallback(() => {
    const last = items.at(-1);
    if (!last || loadingOlder) return;
    setLoadingOlder(true);
    setProblem(null);
    /* PERF-SWEEP 8: a request that never reached the server (a dropped
       connection) used to leave the button spinning for good. It now ends
       the wait and says so, like a refused read does. */
    void loadOlderNotifications({ createdAt: last.createdAt, id: last.id })
      .then((result) => {
        setLoadingOlder(false);
        if (!result.ok) {
          setProblem(result.error);
          return;
        }
        setItems((prev) => {
          const seen = new Set(prev.map((n) => n.id));
          return [...prev, ...result.data.rows.map(toNotificationItem).filter((n) => !seen.has(n.id))];
        });
        setMore(result.data.more);
      })
      .catch(() => {
        setLoadingOlder(false);
        setProblem("Older notifications did not load. Check your connection and try again.");
      });
  }, [items, loadingOlder]);

  const unreadCount = items.filter((n) => !n.read).length;

  const header = (
    <PageHeader
      variant="large"
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
      actions={
        unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAll}
            data-testid="notifications-mark-all"
          >
            Mark all read
          </Button>
        ) : undefined
      }
    />
  );

  if (items.length === 0) {
    return (
      <div>
        {header}
        <EmptyState
          icon="bell-badge"
          title="You are all caught up"
          body="Bookings, messages, agreements and everything happening in your district land here the moment they happen."
          action={
            <ButtonLink href="/search" variant="primary">
              Find a place
            </ButtonLink>
          }
          data-testid="notifications-empty"
        />
      </div>
    );
  }

  /* New is everything unread, Earlier is everything else. Order inside each is
     the order the database gave us, which is newest first. */
  const sections: { label: string; items: NotificationItem[] }[] = [
    { label: "New", items: items.filter((n) => !n.read) },
    { label: "Earlier", items: items.filter((n) => n.read) },
  ].filter((section) => section.items.length > 0);

  return (
    <div>
      {header}

      <div className="nf-notif">
        {sections.map((section) => (
          <section key={section.label} aria-label={section.label}>
            <div className="nf-notif__head">
              <h2 className={TYPE.sectionTitle}>{section.label}</h2>
              <span
                className="nf-notif__count nf-numeric"
                aria-label={`${section.items.length} in ${section.label}`}
              >
                {section.items.length}
              </span>
            </div>
            {/* One shared panel per notification, as GOVERNING-12's
                notification centre draws them (a stack of lit cards, not one
                card with rules between rows), each with its glyph on the
                shared icon plate. Platform sweep, 23 September. */}
            <ul className="nf-notif__list">
              {section.items.map((n) => {
                const inner = (
                  <>
                    <IconPlate size="md">
                      <UiIcon name={iconFor(n.kind)} size={ICON_PLATE_GLYPH.md} />
                    </IconPlate>

                    <span className="nf-notif__body">
                      <span className="nf-notif__title">{n.title}</span>
                      {n.body && (
                        <span className="nf-notif__text">{n.body}</span>
                      )}
                    </span>

                    <span className="nf-notif__meta">
                      <span className="nf-notif__time nf-numeric">
                        {lagosTimeLabel(n.createdAt)}
                      </span>
                      {n.read ? (
                        <span aria-hidden="true" className="h-2.5 w-2.5" />
                      ) : (
                        <>
                          <span aria-hidden="true" className="nf-notif__dot" />
                          <span className="sr-only">Unread</span>
                        </>
                      )}
                    </span>
                  </>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => markOne(n.id)}
                        className="nf-panel nf-panel--card nf-notif__row"
                        data-unread={!n.read}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markOne(n.id)}
                        className="nf-panel nf-panel--card nf-notif__row"
                        data-unread={!n.read}
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {problem && (
        <p role="alert" className="nf-notif__problem" data-testid="notifications-problem">
          {problem}
        </p>
      )}

      {more && (
        <div className="nf-notif__more">
          <Button
            variant="ghost"
            size="sm"
            onClick={showOlder}
            disabled={loadingOlder}
            data-testid="notifications-older"
          >
            {loadingOlder ? "Loading older" : "Show older"}
          </Button>
        </div>
      )}
    </div>
  );
}
