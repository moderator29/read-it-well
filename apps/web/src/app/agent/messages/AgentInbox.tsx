import Link from "next/link";
import type { AgentInbox as Inbox, AgentThread } from "@/lib/agent/messages-queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Chip, ChipRow } from "@/components/ui/Chip";

/**
 * The host inbox.
 *
 * A server component: the filter travels in the address bar rather than in
 * client state, so this surface holds none of its own and a filtered inbox is a
 * link an agent can bookmark or send to a colleague.
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
        className="nf-card block p-md transition-colors hover:border-[var(--nf-border-strong)]"
      >
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
              {thread.counterpartName}
            </p>
            {thread.listingTitle && (
              <p className="mt-2xs flex items-center gap-1.5 text-[0.78rem] text-[var(--nf-content-muted)]">
                <UiIcon name="location" size={12} className="shrink-0" />
                <span className="truncate">{thread.listingTitle}</span>
              </p>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-xs">
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
      {/* The shared rail. A selected link chip is describing where the reader
          already is, so the primitive marks it `aria-current="page"` rather
          than pressed, and paints selection as a ring and a fill instead of the
          `.nf-chip--active` border glow that a phone in daylight cannot show. */}
      <nav aria-label="Filter enquiries">
        <ChipRow bleed={false}>
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              behaviour="link"
              href={chip.key === "all" ? "/agent/messages?filter=all" : "/agent/messages"}
              selected={chip.key === filter}
              count={chip.count}
            >
              {chip.label}
            </Chip>
          ))}
        </ChipRow>
      </nav>

      {threads.length > 0 ? (
        <ul className="mt-md grid gap-sm">
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </ul>
      ) : (
        <div className="nf-card mt-md p-xl text-center">
          <span className="mx-auto block h-16 w-16">
            <BrandIcon name="chat-duo" fill />
          </span>
          <p className="mt-3.5 font-semibold text-[var(--nf-content-primary)]">
            {filter === "waiting" ? "Nobody is waiting on you" : "No enquiries yet"}
          </p>
          <p className="mx-auto mt-2xs max-w-[40ch] text-[0.875rem] text-[var(--nf-content-muted)]">
            {filter === "waiting"
              ? "Every enquiry has had your reply. That is exactly how a guest decides to book."
              : "When a guest messages you about one of your listings, the thread lands here."}
          </p>
          {filter === "waiting" && inbox.threads.length > 0 && (
            <Link href="/agent/messages?filter=all" className="nf-btn nf-btn--glass mt-md">
              See all enquiries
            </Link>
          )}
          {inbox.threads.length === 0 && (
            <Link href="/agent/listings" className="nf-btn nf-btn--primary mt-md">
              My listings
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
