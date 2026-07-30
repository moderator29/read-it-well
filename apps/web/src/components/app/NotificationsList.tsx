"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * Notifications list.
 *
 * The inbox mirrors what is live elsewhere in the app: the confirmed Lekki
 * booking, the agent conversation, the funded wallet. Filters work, tapping
 * an item marks it read (and follows its link when it has one), mark-all
 * clears the lot, and read state persists on this device until accounts land.
 */

type Filter = "all" | "bookings" | "messages" | "offers";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bookings", label: "Bookings" },
  { key: "messages", label: "Messages" },
  { key: "offers", label: "Offers" },
];

type Item = {
  id: string;
  kind: Filter;
  icon: BrandIconName;
  title: string;
  body: string;
  when: string;
  /** Where tapping the notification leads. Absent items only mark as read. */
  href?: string;
};

const ITEMS: Item[] = [
  {
    id: "booking-lekki",
    kind: "bookings",
    icon: "calendar-check",
    title: "Booking confirmed",
    body: "Lekki Palm Grove Shortlet is locked in. Your check-in details are waiting under Bookings.",
    when: "Today",
    href: "/bookings",
  },
  {
    id: "message-adaeze",
    kind: "messages",
    icon: "chat",
    title: "New message from Adaeze Okafor",
    body: "About Eko Pearl Waterfront Apartment: a viewing slot has opened up this week.",
    when: "Today",
    href: "/messages",
  },
  {
    id: "offer-calabar",
    kind: "offers",
    icon: "luggage-check",
    title: "Weekend escape to Calabar",
    body: "Waterfront hotels and the Kwa Falls day trip are trending. See what is on this weekend.",
    when: "Yesterday",
    href: "/search?q=Calabar",
  },
  {
    id: "wallet-ready",
    kind: "all",
    icon: "wallet-secure",
    title: "Your wallet is ready",
    body: "Fund it once and pay for any stay in seconds, all in naira.",
    when: "Yesterday",
    href: "/wallet",
  },
  {
    id: "welcome",
    kind: "all",
    icon: "bell-alert",
    title: "Welcome to RentMe",
    body: "Your account is ready. Start exploring stays, food and experiences.",
    when: "3 days ago",
  },
];

const STORE = "nf_notifications_read";

export function NotificationsList() {
  const [filter, setFilter] = useState<Filter>("all");
  const [read, setRead] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setRead(JSON.parse(raw) as string[]);
    } catch {
      /* fresh device */
    }
  }, []);

  const persist = (next: string[]) => {
    setRead(next);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const markAll = () => persist(ITEMS.map((i) => i.id));

  const visible = ITEMS.filter((i) => filter === "all" || i.kind === filter);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <ul className="nf-scroll-x flex gap-2">
          {FILTERS.map((f) => (
            <li key={f.key}>
              <button
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={`nf-chip ${filter === f.key ? "nf-chip--active" : ""}`}
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={markAll} className="nf-btn nf-btn--ghost px-3 py-2 text-[0.8125rem]">
          Mark all read
        </button>
      </div>

      {visible.length > 0 ? (
        <ul className="nf-card divide-y divide-[var(--nf-border-subtle)] p-0">
          {visible.map((n) => {
            const unread = !read.includes(n.id);
            const markRead = () => persist([...new Set([...read, n.id])]);
            const rowClass =
              "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--nf-glass-fill)]";
            const inner = (
              <>
                <span className="h-11 w-11 shrink-0">
                  <BrandIcon name={n.icon} fill />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[0.9063rem] font-semibold">{n.title}</span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    {n.body}
                  </span>
                  <span className="mt-1 block text-[0.7rem] text-[var(--nf-content-muted)]">{n.when}</span>
                </span>
                {unread && (
                  <>
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--nf-brand-primary)] transition-opacity"
                    />
                    <span className="sr-only">Unread</span>
                  </>
                )}
              </>
            );
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} onClick={markRead} className={rowClass}>
                    {inner}
                  </Link>
                ) : (
                  <button type="button" onClick={markRead} className={rowClass}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="nf-card p-6 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
          Nothing here yet. Activity in this category will appear the moment it happens.
        </p>
      )}
    </div>
  );
}
