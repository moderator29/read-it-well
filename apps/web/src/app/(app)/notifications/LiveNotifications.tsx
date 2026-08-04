"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { markNotificationsRead } from "@/lib/messages/notifications-actions";
import { lagosTimeLabel } from "@/lib/messages/time";
import { useNotificationsRealtime, type LiveNotificationRow } from "@/lib/messages/useRealtime";

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
          <button
            type="button"
            onClick={markAll}
            data-testid="notifications-mark-all"
            className="nf-btn nf-btn--ghost nf-btn--sm"
          >
            Mark all read
          </button>
        ) : undefined
      }
    />
  );

  if (items.length === 0) {
    return (
      <div>
        {header}
        <div className="nf-card nf-rise p-6 text-center">
          <span className="nf-story-art mx-auto block h-16 w-16">
            <BrandIcon name="bell-badge" fill />
          </span>
          <h2 className="nf-h3 mt-4">You are all caught up</h2>
          <p className="mx-auto mt-2 max-w-md text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
            Bookings, messages, wallet activity and everything happening in your
            district will land here the moment it does.
          </p>
          <div className="mt-5 flex justify-center">
            <Link href="/search" className="nf-btn nf-btn--primary">
              Explore places
            </Link>
          </div>
        </div>
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

      <div className="space-y-5">
        {sections.map((section) => (
          <section key={section.label} aria-label={section.label}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-[0.9375rem] font-bold text-[var(--nf-content-primary)]">
                {section.label}
              </h2>
              <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
                {section.items.length}
              </span>
            </div>
            <ul className="nf-card divide-y divide-[var(--nf-border-subtle)] p-0">
              {section.items.map((n) => {
                const rowClass =
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--nf-glass-fill)]";
                const inner = (
                  <>
                    {/* Avatar with the kind riding its corner, so a glance
                        separates a follow from a booking without reading. */}
                    <span className="relative shrink-0" aria-hidden="true">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[var(--nf-electric-300)]">
                        <UiIcon name={iconFor(n.kind)} size={18} />
                      </span>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--nf-surface-primary)] bg-[var(--nf-brand-primary)]" />
                    </span>

                    <span className="min-w-0 flex-1 leading-tight">
                      <span
                        className={`block text-[0.9063rem] ${
                          n.read
                            ? "font-medium text-[var(--nf-content-secondary)]"
                            : "font-semibold text-[var(--nf-content-primary)]"
                        }`}
                      >
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                          {n.body}
                        </span>
                      )}
                    </span>

                    <span className="flex shrink-0 flex-col items-end gap-2">
                      <span className="nf-numeric text-[0.7rem] text-[var(--nf-content-muted)]">
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
