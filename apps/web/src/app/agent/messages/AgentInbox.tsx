import Link from "next/link";
import type { AgentInbox as Inbox, AgentThread } from "@/lib/agent/messages-queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The host inbox.
 *
 * A server component: the filter travels in the address bar rather than in
 * client state, so this surface ships no JavaScript of its own and a filtered
 * inbox is a link an agent can bookmark or send to a colleague.
 *
 * The ordering is the opinion here. A host does not want their enquiries newest
 * first, they want the one that has been waiting longest on them, because that
 * is the one costing them a booking.
 */

export type InboxFilter = "waiting" | "all";

function waitLabel(hours: number): string {
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h waiting`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day waiting" : `${days} days waiting`;
}

function ThreadRow({ thread }: { thread: AgentThread }) {
  return (
    <li>
      <Link
        href={`/messages/${thread.id}`}
        className="nf-card block p-4 transition-colors hover:border-[var(--nf-border-strong)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
              {thread.counterpartName}
            </p>
            {thread.listingTitle && (
              <p className="mt-1 flex items-center gap-1.5 text-[0.78rem] text-[var(--nf-content-muted)]">
                <UiIcon name="location" size={12} className="shrink-0" />
                <span className="truncate">{thread.listingTitle}</span>
              </p>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-2">
            {thread.unread > 0 && (
              <span className="nf-numeric nf-badge nf-badge--brand">{thread.unread}</span>
            )}
            <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
              {thread.whenLabel}
            </span>
          </span>
        </div>

        <p className="mt-2.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {thread.lastMessage}
        </p>

        {thread.waitingOnYou && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[0.75rem] font-semibold text-[var(--nf-state-warning)]">
            <UiIcon name="bell" size={12} className="shrink-0" />
            {waitLabel(thread.waitingHours)}
          </p>
        )}
      </Link>
    </li>
  );
}

export function AgentInbox({ inbox, filter }: { inbox: Inbox; filter: InboxFilter }) {
  const threads = filter === "waiting" ? inbox.threads.filter((t) => t.waitingOnYou) : inbox.threads;

  const chips: { key: InboxFilter; label: string; count: number }[] = [
    { key: "waiting", label: "Waiting on you", count: inbox.waitingCount },
    { key: "all", label: "All enquiries", count: inbox.threads.length },
  ];

  return (
    <div>
      <nav aria-label="Filter enquiries" className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = chip.key === filter;
          return (
            <Link
              key={chip.key}
              href={chip.key === "all" ? "/agent/messages?filter=all" : "/agent/messages"}
              aria-current={active ? "page" : undefined}
              className={`nf-chip ${active ? "nf-chip--active" : ""}`}
            >
              {chip.label}
              <span className="nf-numeric ml-1.5 opacity-70">{chip.count}</span>
            </Link>
          );
        })}
      </nav>

      {threads.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </ul>
      ) : (
        <div className="nf-card mt-4 p-8 text-center">
          <span className="mx-auto block h-16 w-16">
            <BrandIcon name="chat-duo" fill />
          </span>
          <p className="mt-3.5 font-semibold text-[var(--nf-content-primary)]">
            {filter === "waiting" ? "Nobody is waiting on you" : "No enquiries yet"}
          </p>
          <p className="mx-auto mt-1 max-w-[40ch] text-[0.875rem] text-[var(--nf-content-muted)]">
            {filter === "waiting"
              ? "Every enquiry has had your reply. That is exactly how a guest decides to book."
              : "When a guest messages you about one of your listings, the thread lands here."}
          </p>
          {filter === "waiting" && inbox.threads.length > 0 && (
            <Link href="/agent/messages?filter=all" className="nf-btn nf-btn--glass mt-4">
              See all enquiries
            </Link>
          )}
          {inbox.threads.length === 0 && (
            <Link href="/agent/listings" className="nf-btn nf-btn--primary mt-4">
              My listings
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
