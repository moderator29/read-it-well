"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ConversationSummary } from "@/lib/messages/types";

/**
 * Conversation list.
 *
 * Each row leads into its thread. The unread dot clears once a thread has been
 * opened; read state persists on this device under `nf_messages_read` until
 * the messaging backend lands and owns it.
 */

const READ_KEY = "nf_messages_read";

function loadRead(): string[] {
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-07-28T09:14" renders as "09:14" when it falls on `today` and as
 * "26 Jul" otherwise. Pure string work on the server-provided date, so the
 * server and client always paint the same label.
 */
function whenLabel(sentAt: string, today: string): string {
  if (sentAt.startsWith(today)) return sentAt.slice(11, 16);
  const month = MONTHS[Number(sentAt.slice(5, 7)) - 1] ?? "";
  return `${Number(sentAt.slice(8, 10))} ${month}`;
}

export function ConversationList({
  conversations,
  today,
}: {
  conversations: ConversationSummary[];
  /** Server-resolved local date, `YYYY-MM-DD`. */
  today: string;
}) {
  const [read, setRead] = useState<string[]>([]);

  useEffect(() => {
    setRead(loadRead());
  }, []);

  if (conversations.length === 0) {
    return (
      <p className="nf-card p-6 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
        No conversations yet. Message an agent from any listing to start one.
      </p>
    );
  }

  return (
    <ul className="nf-card divide-y divide-[var(--nf-border-subtle)] p-0">
      {conversations.map((c) => {
        const unread = c.unread && !read.includes(c.id);
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              className="flex w-full items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--nf-glass-fill)]"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[0.9375rem] font-bold text-[var(--nf-electric-300)]"
              >
                {c.agentName.charAt(0)}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="truncate text-[0.9063rem] font-semibold">{c.agentName}</span>
                  <span className="nf-numeric shrink-0 text-[0.7rem] text-[var(--nf-content-muted)]">
                    {whenLabel(c.lastMessageAt, today)}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--nf-content-muted)]">
                  {c.listingTitle}
                </span>
                <span
                  className={`mt-1 block truncate text-[0.8125rem] leading-relaxed ${
                    unread
                      ? "font-medium text-[var(--nf-content-primary)]"
                      : "text-[var(--nf-content-secondary)]"
                  }`}
                >
                  {c.lastMessage}
                </span>
              </span>
              {unread && (
                <span
                  aria-label="Unread"
                  className="mt-4 h-2 w-2 shrink-0 rounded-full bg-[var(--nf-brand-primary)]"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
