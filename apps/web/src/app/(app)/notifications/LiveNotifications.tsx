"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { markNotificationsRead } from "@/lib/messages/notifications-actions";
import { lagosTimeLabel } from "@/lib/messages/time";
import { useNotificationsRealtime, type LiveNotificationRow } from "@/lib/messages/useRealtime";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, ICON, SECTION_GAP, TYPE } from "@/components/app/Screen";

/**
 * The signed-in notifications inbox.
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
 * Every sentence on this screen was written by a database trigger. Follows,
 * replies, mentions, likes, reposts, badges and every moderation transition
 * all write public.notifications themselves, so this file is the surface and
 * never the source.
 */

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

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
  userId,
}: {
  initial: NotificationItem[];
  userId: string;
}) {
  const [items, setItems] = useState<NotificationItem[]>(initial);

  useNotificationsRealtime(userId, (row: LiveNotificationRow) => {
    setItems((prev) => {
      if (prev.some((n) => n.id === row.id)) return prev;
      return [
        {
          id: row.id,
          kind: row.kind,
          title: row.title,
          body: row.body,
          href: row.href,
          read: row.read_at !== null,
          createdAt: row.created_at,
        },
        ...prev,
      ];
    });
  });

  const markOne = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    void markNotificationsRead({ ids: [id] });
  }, []);

  const markAll = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    void markNotificationsRead({});
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  const header = (
    <PageHeader
      title="Notifications"
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
          body="Bookings, messages, wallet activity and everything happening in your district land here the moment they happen."
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

      <div className={SECTION_GAP}>
        {sections.map((section) => (
          <section key={section.label} aria-label={section.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className={TYPE.sectionTitle}>{section.label}</h2>
              <span className={`nf-numeric ${TYPE.caption}`}>{section.items.length}</span>
            </div>
            <ul className="divide-y divide-[var(--nf-border-subtle)]">
              {section.items.map((n) => {
                /* py-4 on a 1rem title gives a row past 60px, comfortably over
                   the 44px minimum. The old py-3.5 on 0.9rem text did not. */
                const rowClass =
                  "flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-[var(--nf-glass-fill)]";
                const inner = (
                  <>
                    {/*
                      THE GLYPH SITS ON THE SURFACE. It was inside a 44px
                      tinted disc with a second brand dot riding its corner:
                      a plate behind an icon, plus an ornament on the plate,
                      repeated down the whole list. The kind is still legible
                      at a glance because the glyph is bigger than the one it
                      replaces, and the unread state is already stated by the
                      dot on the right and by the weight of the title.
                    */}
                    <UiIcon
                      name={iconFor(n.kind)}
                      size={ICON.row}
                      className={`shrink-0 ${
                        n.read
                          ? "text-[var(--nf-content-muted)]"
                          : "text-[var(--nf-brand-secondary)]"
                      }`}
                    />

                    <span className="min-w-0 flex-1 leading-tight">
                      <span
                        className={`block text-[1rem] leading-snug ${
                          n.read
                            ? "font-medium text-[var(--nf-content-secondary)]"
                            : "font-semibold text-[var(--nf-content-primary)]"
                        }`}
                      >
                        {n.title}
                      </span>
                      {n.body && (
                        <span className={`mt-1 block ${TYPE.rowMeta}`}>{n.body}</span>
                      )}
                    </span>

                    <span className="flex shrink-0 flex-col items-end gap-2">
                      <span className={`nf-numeric ${TYPE.caption}`}>
                        {lagosTimeLabel(n.createdAt)}
                      </span>
                      {n.read ? (
                        <span aria-hidden="true" className="h-2.5 w-2.5" />
                      ) : (
                        <>
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-full bg-[var(--nf-brand-primary)]"
                          />
                          <span className="sr-only">Unread</span>
                        </>
                      )}
                    </span>
                  </>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} onClick={() => markOne(n.id)} className={rowClass}>
                        {inner}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => markOne(n.id)} className={rowClass}>
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
    </div>
  );
}
