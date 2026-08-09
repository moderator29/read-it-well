"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markInboxRead } from "@/lib/messages/actions";
import { useInboxTyping } from "@/lib/messages/useRealtime";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { VerifiedAvatar } from "@/components/messages/VerifiedAvatar";
import { Segmented } from "@/components/ui/Segmented";
import { TextField } from "@/components/ui/Field";
import { EmptyState, ICON, TYPE } from "@/components/app/Screen";

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

function Row({ row, typing }: { row: InboxRow; typing: boolean }) {
  return (
    <li>
      <Link
        href={`/messages/${row.id}`}
        data-testid="inbox-row"
        className="flex w-full items-center gap-md py-group transition-colors hover:bg-[var(--nf-glass-fill)]"
      >
        {/* ------------------------------------------------------ avatar

            The verified mark rides the avatar now rather than sitting as a
            12px tick beside the name. Two reasons. It is where every messaging
            product puts it, so it is found without being looked for. And in a
            list, the avatar is what the eye lands on: a mark on the name is
            read after you have already decided whether to open the thread. */}
        <VerifiedAvatar
          name={row.counterpartName}
          verified={row.counterpartVerified}
          kind={row.counterpartKind}
          size="md"
        />

        {/* -------------------------------------------------------- body */}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-inline-tight">
            <span className={`truncate ${TYPE.rowTitle}`}>{row.counterpartName}</span>
            {/* The tick that used to be here is on the avatar. One mark per
                person per row: two is how a badge stops being read. */}
          </span>
          {/* The property this thread is about. It is the reason the
              conversation exists, so it is legible rather than micro-print. */}
          {row.listingTitle && (
            <span className={`mt-inline-tight block truncate ${TYPE.rowMeta}`}>{row.listingTitle}</span>
          )}
          <span
            className={`nf-body mt-inline-tight block truncate leading-relaxed ${
              typing
                ? "font-semibold text-[var(--nf-brand-secondary)]"
                : row.unread > 0
                  ? "font-medium text-[var(--nf-content-primary)]"
                  : "text-[var(--nf-content-secondary)]"
            }`}
          >
            {typing ? "Typing..." : row.lastMessage}
          </span>
        </span>

        {/* --------------------------------------------- time and marker */}
        <span className="flex shrink-0 flex-col items-end gap-inline self-stretch">
          <span className={`nf-numeric ${TYPE.caption}`}>{row.whenLabel}</span>
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

/**
 * The one empty state this surface has, for every reason it can be empty.
 *
 * Exported because the signed-out page needs the same panel and a second copy
 * of it would drift, which this file's own history says out loud: the module
 * comment on `SocialPaused` records ten hand-written paused screens doing
 * exactly that. A second action is optional and only the signed-out case uses
 * it, because that is the only case with two genuinely different next steps.
 */
export function InboxEmpty({
  title,
  body,
  action,
  secondary,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <EmptyState
      icon="chat-duo"
      title={title}
      body={body}
      data-testid="inbox-empty"
      action={
        action && (
          <Link href={action.href} className="nf-btn nf-btn--primary nf-btn--md">
            {action.label}
          </Link>
        )
      }
      secondary={
        secondary && (
          <Link href={secondary.href} className="nf-btn nf-btn--ghost nf-btn--md">
            {secondary.label}
          </Link>
        )
      }
    />
  );
}

/** The local name, so the four call sites below read as they did. */
const Empty = InboxEmpty;

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
      {/*
        THE COMPOSE CONTROL WENT NOWHERE. It linked to `/messages/new`, and that
        route's first line is `if (!listing) redirect("/messages")` - so the
        button bounced straight back to the screen it was pressed on. A control
        that does nothing is worse than no control, and this one advertised a
        capability the product does not have.

        It is not removed, it is pointed at the truth. Every conversation on
        RentMe starts from a property, because the thread is with the agent
        FOR that property; there is no freeform compose and there should not
        be one. So the control now goes where a person would actually start a
        new conversation, and its label says so.
      */}
      {/*
        MARK ALL READ MOVED INTO THE HEADER, AND A ROW LEAVES THE SCREEN.

        This screen stacked four control surfaces between the title and the
        first conversation: the header, a search field, three tabs, and then a
        right-aligned row holding one ghost button. That last one was a whole
        row of vertical space, on a phone, for a control most people press once
        a week, and it appeared and disappeared as the unread count crossed
        zero, so the list below it jumped by 40px whenever somebody read their
        last message.

        It is a header action now, beside the one that starts a conversation,
        which is where a screen-level action belongs. Nothing is hidden: it
        still carries its own count and it still only renders when there is
        something to mark, but it no longer moves the list when it goes.
      */}
      <PageHeader
        title="Inbox"
        actions={
          <div className="flex shrink-0 items-center gap-inline">
            {canMarkRead && unreadTotal > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={marking}
                data-testid="inbox-mark-read"
                className="nf-btn nf-btn--ghost nf-btn--sm disabled:opacity-60"
              >
                {marking ? "Marking..." : `Mark all read (${unreadTotal})`}
              </button>
            )}
            <Link
              href="/search"
              aria-label="Find a place to message an agent about"
              data-testid="inbox-compose"
              className="nf-icon-btn h-11 w-11"
            >
              <UiIcon name="search" size={ICON.row} />
            </Link>
          </div>
        }
      />

      {/* -------------------------------------------------------- search */}
      {/* The clear affordance is the whole reason this is the primitive: a
          search that filters as you type needs a way back to everything that
          is not "select all and delete", and the platform's other four search
          bars each hand-rolled the icon slot at a different size. */}
      <TextField
        label="Search messages"
        hideLabel
        type="search"
        leadingIcon="search"
        clearable="Clear the search"
        onClear={() => setQuery("")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search messages..."
        data-testid="inbox-search"
      />

      {/* ---------------------------------------------------------- tabs */}
      {/*
        This was a `role="tablist"` of `role="tab"` chips with `aria-selected`
        and NOTHING else: no panel, no `aria-controls`, no roving tabindex, no
        arrow keys. A tablist that controls nothing is a promise to a screen
        reader that the surface does not keep.

        It is made a REAL tablist rather than demoted to a filter row, because
        the three tabs genuinely swap which conversations the list below shows -
        that is a view switch, not an attribute filter - and the list is a panel
        that can name itself. `Segmented` brings the roving tabindex and the
        arrow keys with it.

        No `panelIdPrefix`: only the selected panel exists, so `aria-controls`
        on the other two would dangle. The panel points back with
        `aria-labelledby`.
      */}
      <div className="mt-heading">
        <Segmented<Tab>
          label="Filter conversations"
          /* The default `md` rung, not `sm`. `Segmented` paints its real
             height with no overflowing hit area the way `Chip` and `Switch`
             have, so `sm` is a genuine 36px target - under the 44pt floor, and
             `icons-and-targets` catches it. */
          full
          options={TABS.map((entry) => ({
            value: entry.key,
            label: entry.label,
            /* Requests is the only tab that carries a count, and only when
               somebody is actually waiting in it. */
            ...(entry.key === "requests" && requests.length > 0
              ? { count: requests.length }
              : null),
          }))}
          value={tab}
          onChange={setTab}
          itemIdPrefix="inbox-tab"
        />
      </div>

      {markError && (
        <p role="alert" className="nf-body-sm mt-inline text-[var(--nf-state-warning)]">
          {markError}
        </p>
      )}

      {/* ---------------------------------------------------------- list */}
      {/* The panel the tabs above actually control. It is keyed on the tab so
          the list re-enters rather than mutating in place, and it names its own
          tab, which is what makes the tablist a tablist. */}
      <div
        key={tab}
        role="tabpanel"
        id={`inbox-panel-${tab}`}
        aria-labelledby={`inbox-tab-${tab}`}
        className="mt-heading"
      >
        {shown.length > 0 ? (
          /* Hairline rows on the ground, not a card wrapping a divided list.
             One line between two conversations, nothing around either. */
          <ul className="divide-y divide-[var(--nf-border-subtle)]">
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
            body="Open any property and tap Message agent. The thread appears here, with the property attached, so nobody has to ask which one you mean."
            action={{ href: "/search", label: "Find a place" }}
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
