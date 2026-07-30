import Link from "next/link";
import type { LiveConversationSummary } from "@/lib/messages/live";

/**
 * The signed-in conversation list. Pure server render: rows carry their
 * counterpart, listing, preview and unread count straight from the database,
 * so there is no client state to drift. Opening a thread marks it read there,
 * and the next visit here shows the truth.
 */
export function LiveThreadList({ conversations }: { conversations: LiveConversationSummary[] }) {
  if (conversations.length === 0) {
    return (
      <div className="nf-card p-6 text-center">
        <p className="text-[0.9063rem] font-semibold">No conversations yet</p>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          Message an agent from any listing and the thread will appear here.
        </p>
        <Link href="/search" className="nf-btn nf-btn--primary mt-4 inline-flex">
          Explore places
        </Link>
      </div>
    );
  }

  return (
    <ul className="nf-card divide-y divide-[var(--nf-border-subtle)] p-0">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/messages/${c.id}`}
            className="flex w-full items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--nf-glass-fill)]"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[0.9375rem] font-bold text-[var(--nf-electric-300)]"
            >
              {c.counterpartName.charAt(0)}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="flex items-baseline justify-between gap-4">
                <span className="truncate text-[0.9063rem] font-semibold">{c.counterpartName}</span>
                <span className="nf-numeric shrink-0 text-[0.7rem] text-[var(--nf-content-muted)]">
                  {c.whenLabel}
                </span>
              </span>
              {c.listingTitle && (
                <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--nf-content-muted)]">
                  {c.listingTitle}
                </span>
              )}
              <span
                className={`mt-1 block truncate text-[0.8125rem] leading-relaxed ${
                  c.unread > 0
                    ? "font-medium text-[var(--nf-content-primary)]"
                    : "text-[var(--nf-content-secondary)]"
                }`}
              >
                {c.lastMessage}
              </span>
            </span>
            {c.unread > 0 && (
              <span
                aria-label={`${c.unread} unread`}
                className="nf-numeric mt-3.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--nf-brand-primary)] px-1.5 text-[0.7rem] font-bold text-white"
              >
                {c.unread > 99 ? "99+" : c.unread}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
