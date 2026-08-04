"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markInboxRead } from "@/lib/messages/actions";
import { useInboxTyping } from "@/lib/messages/useRealtime";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The Inbox.
 *
 * One list component for both worlds: the signed-in reader gets real
 * conversations under RLS, the signed-out reader gets the seed threads, and
 * both are the same rows with the same states, so the surface cannot look like
 * two different products depending on who is holding it.
 *
 * Three tabs, and the middle one is the point. Requests holds a thread opened
 * by somebody the reader has never spoken to, so a stranger arrives in a
 * waiting room rather than in the main list. That is one of the platform's
 * three standing refusals about messaging, made visible.
 *
 * Typing is real: the thread view has broadcast on `typing-<id>` since
 * messaging shipped, and the rows listen on exactly those channels. Where
 * there is no Supabase connection the hook is inert and no row ever claims
 * somebody is typing.
 */

export type InboxRow = {
  id: string;
  counterpartName: string;
  listingTitle: string | null;
  lastMessage: string;
  whenLabel: string;
  unread: number;
  isRequest: boolean;
  counterpartKind: "agent" | "member";
  counterpartVerified: boolean;
};

type Tab = "all" | "primary" | "requests";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "primary", label: "Primary" },
  { key: "requests", label: "Requests" },
];

function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?";
}

function Row({ row, typing }: { row: InboxRow; typing: boolean }) {
  return (
    <li>
      <Link
        href={`/messages/${row.id}`}
        data-testid="inbox-row"
        className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--nf-glass-fill)]"
      >
        {/* ------------------------------------------------------ avatar */}
        <span className="relative shrink-0">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[1rem] font-bold text-[var(--nf-electric-300)]"
          >
            {initialOf(row.counterpartName)}
          </span>
          {/* The dot says what this person is, not whether they are online:
              a green light nobody is maintaining is a lie, and "host" is the
              fact that actually changes how you read the message. */}
          <span
            aria-hidden="true"
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--nf-surface-primary)] ${
              row.counterpartKind === "agent"
                ? "bg-[var(--nf-brand-primary)]"
                : "bg-[var(--nf-content-muted)]"
            }`}
          />
        </span>

        {/* -------------------------------------------------------- body */}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
              {row.counterpartName}
            </span>
            {row.counterpartVerified && (
              <UiIcon
                name="verified"
                size={13}
                className="shrink-0 text-[var(--nf-state-success)]"
              />
            )}
          </span>
          {row.listingTitle && (
            <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--nf-content-muted)]">
              {row.listingTitle}
            </span>
          )}
          <span
            className={`mt-1 block truncate text-[0.8125rem] leading-relaxed ${
              typing
                ? "font-semibold text-[var(--nf-electric-300)]"
                : row.unread > 0
                  ? "font-medium text-[var(--nf-content-primary)]"
                  : "text-[var(--nf-content-secondary)]"
            }`}
          >
            {typing ? "Typing..." : row.lastMessage}
          </span>
        </span>

        {/* --------------------------------------------- time and marker */}
        <span className="flex shrink-0 flex-col items-end gap-2 self-stretch pt-0.5">
          <span className="nf-numeric text-[0.7rem] text-[var(--nf-content-muted)]">
            {row.whenLabel}
          </span>
          {row.unread > 0 ? (
            <span
              aria-label={`${row.unread} unread`}
              className="h-2.5 w-2.5 rounded-full bg-[var(--nf-brand-primary)]"
            />
          ) : (
            <span aria-hidden="true" className="h-2.5 w-2.5" />
          )}
        </span>
      </Link>
    </li>
  );
}

function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="nf-card p-8 text-center" data-testid="inbox-empty">
      <span className="nf-story-art mx-auto block h-16 w-16">
        <BrandIcon name="chat-duo" fill />
      </span>
      <p className="mt-3.5 text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
        {title}
      </p>
      <p className="mx-auto mt-1.5 max-w-[38ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
        {body}
      </p>
      {action && (
        <Link href={action.href} className="nf-btn nf-btn--primary mt-4 inline-flex">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Inbox({
  rows,
  meId = null,
  canMarkRead = false,
}: {
  rows: InboxRow[];
  /** The signed-in user, for ignoring our own typing pings. Null when seeded. */
  meId?: string | null;
  /** Only a signed-in reader has read state the server can clear. */
  canMarkRead?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [markError, setMarkError] = useState<string | null>(null);
  const [marking, startMarking] = useTransition();

  const typing = useInboxTyping(
    rows.map((r) => r.id),
    meId,
  );

  const requests = useMemo(() => rows.filter((r) => r.isRequest), [rows]);
  const unreadTotal = rows.reduce((sum, r) => sum + r.unread, 0);

  const shown = useMemo(() => {
    const byTab =
      tab === "requests"
        ? requests
        : tab === "primary"
          ? rows.filter((r) => !r.isRequest)
          : rows;
    const q = query.trim().toLowerCase();
    if (q.length === 0) return byTab;
    return byTab.filter((r) =>
      `${r.counterpartName} ${r.listingTitle ?? ""} ${r.lastMessage}`
        .toLowerCase()
        .includes(q),
    );
  }, [tab, query, rows, requests]);

  const markAllRead = () => {
    setMarkError(null);
    startMarking(async () => {
      const result = await markInboxRead();
      if (result.ok) {
        router.refresh();
        return;
      }
      setMarkError(result.error);
    });
  };

  return (
    <div>
      {/* ------------------------------------------------------- heading */}
      {/* The back control belongs to the page, per the platform's header
          contract, and the compose button rides the same row on the right. */}
      <PageHeader
        title="Inbox"
        actions={
          <Link
            href="/messages/new"
            aria-label="Start a new conversation"
            data-testid="inbox-compose"
            className="nf-icon-btn h-10 w-10"
          >
            <UiIcon name="chat-bubble" size={18} />
          </Link>
        }
      />

      {/* -------------------------------------------------------- search */}
      <label className="relative block">
        <span className="sr-only">Search messages</span>
        <UiIcon
          name="search"
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--nf-content-muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages..."
          data-testid="inbox-search"
          className="nf-field pl-10"
        />
      </label>

      {/* ---------------------------------------------------------- tabs */}
      <div
        role="tablist"
        aria-label="Filter conversations"
        className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((entry) => {
          const active = entry.key === tab;
          const count = entry.key === "requests" ? requests.length : 0;
          return (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(entry.key)}
              className={`nf-chip shrink-0 ${active ? "nf-chip--active" : ""}`}
            >
              {entry.label}
              {count > 0 && <span className="nf-numeric ml-1.5 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------- mark all read */}
      {canMarkRead && unreadTotal > 0 && (
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={markAllRead}
            disabled={marking}
            data-testid="inbox-mark-read"
            className="nf-btn nf-btn--ghost nf-btn--sm disabled:opacity-60"
          >
            {marking ? "Marking..." : `Mark all read (${unreadTotal})`}
          </button>
        </div>
      )}
      {markError && (
        <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--nf-state-warning)]">
          {markError}
        </p>
      )}

      {/* ---------------------------------------------------------- list */}
      <div className="mt-3.5">
        {shown.length > 0 ? (
          <ul className="nf-card divide-y divide-[var(--nf-border-subtle)] p-0">
            {shown.map((row) => (
              <Row key={row.id} row={row} typing={typing.has(row.id)} />
            ))}
          </ul>
        ) : query.trim().length > 0 ? (
          <Empty
            title="Nothing matches that"
            body={`No conversation mentions "${query.trim()}". Try a host's name, a listing or a word from the message.`}
          />
        ) : tab === "requests" ? (
          <Empty
            title="No requests waiting"
            body="A message from somebody you have never spoken to waits here first, so a stranger never lands in your main list."
          />
        ) : rows.length === 0 ? (
          <Empty
            title="No conversations yet"
            body="Message a host from any listing and the thread appears here."
            action={{ href: "/search", label: "Explore places" }}
          />
        ) : (
          <Empty
            title="Nothing in Primary"
            body="Every thread you have is still a request. Reply to one and it moves across."
          />
        )}
      </div>
    </div>
  );
}
