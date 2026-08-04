"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { markNotificationsRead } from "@/lib/messages/notifications-actions";
import { lagosDayLabel, lagosTimeLabel } from "@/lib/messages/time";
import { useNotificationsRealtime, type LiveNotificationRow } from "@/lib/messages/useRealtime";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * The signed-in notifications inbox.
 *
 * Server-loaded rows, day-grouped in Lagos time, with realtime prepend for
 * new arrivals. Reads are optimistic: tapping an item or mark-all flips the
 * local state instantly and the action persists it; the read_at column grant
 * means that is the only field a client can ever change. A dropped socket
 * costs nothing; the next visit renders the database's truth.
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

  if (items.length === 0) {
    return (
      <div className="nf-card nf-rise p-6 text-center">
        <span className="nf-story-art mx-auto block h-16 w-16">
          <BrandIcon name="bell-badge" fill />
        </span>
        <h2 className="nf-h3 mt-4">You are all caught up</h2>
        <p className="mx-auto mt-2 max-w-md text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
          Bookings, messages and wallet activity will land here the moment they happen.
        </p>
        <div className="mt-5 flex justify-center">
          <ButtonLink href="/search" variant="primary">
            Explore places
          </ButtonLink>
        </div>
      </div>
    );
  }

  // ------------------------------------------------- day grouping (Lagos)
  const groups: { label: string; items: NotificationItem[] }[] = [];
  for (const n of items) {
    const label = lagosDayLabel(n.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-[0.8125rem] text-[var(--nf-content-muted)]">
          {unreadCount > 0
            ? `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`
            : "Nothing unread"}
        </p>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAll}>
            Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h2 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-[var(--nf-content-muted)]">
              {group.label}
            </h2>
            <ul className="nf-card divide-y divide-[var(--nf-border-subtle)] p-0">
              {group.items.map((n) => {
                const rowClass =
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--nf-glass-fill)]";
                const inner = (
                  <>
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[var(--nf-electric-300)]"
                      aria-hidden="true"
                    >
                      <UiIcon name={iconFor(n.kind)} size={17} />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span
                        className={`block text-[0.9063rem] ${
                          n.read ? "font-medium text-[var(--nf-content-secondary)]" : "font-semibold"
                        }`}
                      >
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                          {n.body}
                        </span>
                      )}
                      <span className="nf-numeric mt-1 block text-[0.7rem] text-[var(--nf-content-muted)]">
                        {lagosTimeLabel(n.createdAt)}
                      </span>
                    </span>
                    {!n.read && (
                      <>
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--nf-brand-primary)]"
                        />
                        <span className="sr-only">Unread</span>
                      </>
                    )}
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
