"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/design-system/icons/Icon";

/**
 * Notifications list.
 *
 * One real notification exists from day one (the welcome), so the surface is
 * genuinely functional rather than an empty promise: filters work, tapping an
 * item marks it read, mark-all clears the lot, and read state persists on this
 * device until accounts land.
 */

type Filter = "all" | "bookings" | "messages" | "offers";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bookings", label: "Bookings" },
  { key: "messages", label: "Messages" },
  { key: "offers", label: "Offers" },
];

const ITEMS = [
  {
    id: "welcome",
    kind: "all" as Filter,
    title: "Welcome to NaijaFinds",
    body: "Your account is ready. Start exploring stays, food and experiences.",
    when: "Today",
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
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => persist([...new Set([...read, n.id])])}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--nf-glass-fill)]"
                >
                  <span className="h-8 w-8 shrink-0">
                    <Icon name="notification" fill />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[0.9063rem] font-semibold">{n.title}</span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                      {n.body}
                    </span>
                    <span className="mt-1 block text-[0.7rem] text-[var(--nf-content-muted)]">{n.when}</span>
                  </span>
                  {unread && (
                    <span
                      aria-label="Unread"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--nf-brand-primary)] transition-opacity"
                    />
                  )}
                </button>
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
