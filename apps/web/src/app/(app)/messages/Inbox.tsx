"use client";

import { useMemo, useState, useTransition } from "react";
import { useClientCopy } from "@/lib/i18n/client-copy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markInboxRead } from "@/lib/messages/actions";
import { archiveConversation, unarchiveConversation } from "@/lib/messages/archive";
import { Chip } from "@/components/ui/Chip";
import type { Side } from "@/lib/side.constants";
import { useInboxTyping } from "@/lib/messages/useRealtime";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { VerifiedAvatar } from "@/components/messages/VerifiedAvatar";
import type { Dictionary } from "@vallo/i18n/core";
import type { ThreadContextKind } from "@/lib/messages/db";
import { Segmented } from "@/components/ui/Segmented";
import { TextField } from "@/components/ui/Field";
import { EmptyState, ICON, TYPE } from "@/components/app/Screen";
import { sharePreview } from "@/components/app/messages/share";
import { type BadgeTier } from "@/lib/trust/badge-tier";

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
  /** The counterpart's published badge, `public.person_badge.tier`. */
  counterpartTier: BadgeTier;
  /**
   * What the thread is for. A listing thread carries no glyph, because it is
   * the ordinary case; a table or a stay carries a small one beside its
   * subject line so the inbox stays one list on both sides while a row still
   * says which kind of thing it is about. `UiIcon` tier only: a glass object
   * in a list row is exactly the thing the surface language forbids.
   */
  contextKind?: ThreadContextKind;
  /** Property or Stays (track G). Absent reads as Property. */
  side?: Side;
  /** Archived by this reader, and not answered since. */
  archived?: boolean;
  /** This reader reported the conversation, a message in it or the person. */
  reported?: boolean;
};

const CONTEXT_GLYPH: Partial<Record<ThreadContextKind, UiIconName>> = {
  reservation: "utensils",
  booking: "building-hotel",
  business: "building-hotel",
};

/*
 * TWO AXES (track G, 25 September 2026).
 *
 * The SIDE is the product's two-sided model, Property and Stays, as the top
 * tabs: a rental enquiry and a hotel booking are different errands and each
 * side's list is short enough to scan. It opens on the side the shell is on.
 *
 * The VIEW is which of this reader's threads: Recent (everything live that is
 * not a request), Requests (a stranger's first message waits here, the
 * platform's standing refusal about messaging), Archived (put away by this
 * reader only; the other party still sees it) and Reported (threads this
 * reader reported). All and Primary were folded: Recent is Primary, and a
 * list of everything mixed requests back in, which is what Requests exists to
 * stop.
 */
type View = "recent" | "requests" | "archived" | "reported";
const VIEW_ORDER: View[] = ["recent", "requests", "archived", "reported"];
const VIEW_LABEL: Record<View, string> = {
  recent: "Recent",
  requests: "Requests",
  archived: "Archived",
  reported: "Reported",
};
const SIDE_ORDER: Side[] = ["property", "stays"];
const SIDE_LABEL: Record<Side, string> = { property: "Property", stays: "Stays" };

function inView(row: InboxRow, view: View): boolean {
  if (view === "reported") return row.reported === true;
  if (view === "archived") return row.archived === true;
  if (row.archived) return false;
  return view === "requests" ? row.isRequest : !row.isRequest;
}

function Row({
  row,
  typing,
  onArchive,
  archivePending,
}: {
  row: InboxRow;
  typing: boolean;
  /** Absent where archiving is not open (signed out, or the table is not live). */
  onArchive?: (row: InboxRow) => void;
  archivePending?: boolean;
}) {
  const glyph = row.contextKind ? CONTEXT_GLYPH[row.contextKind] : undefined;
  /* A shared card previews as its words, never as the path it carries. */
  const preview = sharePreview(row.lastMessage) ?? row.lastMessage;
  return (
    <li className="flex items-center gap-3xs">
      <Link href={`/messages/${row.id}`} data-testid="inbox-row" className="nf-inbox-row min-w-0 flex-1">
        {/* The avatar in the thread family's lit ring, carrying the verified
            mark: one mark per person per row, where the eye lands first. */}
        <span className="nf-inbox-row__ring">
          <VerifiedAvatar
            name={row.counterpartName}
            tier={row.counterpartTier}
            kind={row.counterpartKind}
            size="md"
          />
        </span>

        <span className="min-w-0 flex-1 leading-tight">
          <span className={`block truncate ${TYPE.rowTitle}`}>{row.counterpartName}</span>
          {row.listingTitle && (
            <span className={`mt-3xs flex items-center gap-inline-tight ${TYPE.caption} text-[var(--nf-brand-secondary)]`}>
              {glyph && row.contextKind && (
                <UiIcon name={glyph} size={16} className="shrink-0" label={row.contextKind} />
              )}
              {/* Two lines, then the ellipsis, with the whole title on hover: a
                  listing title cut at one line lost the words that tell two
                  flats apart ("Luxury 2 bedroom apartm..."). */}
              <span className="min-w-0 line-clamp-2 [overflow-wrap:anywhere]" title={row.listingTitle}>
                {row.listingTitle}
              </span>
            </span>
          )}
          <span
            className={`nf-body-sm mt-3xs block truncate ${
              typing
                ? "font-semibold text-[var(--nf-brand-secondary)]"
                : row.unread > 0
                  ? "font-medium text-[var(--nf-content-primary)]"
                  : "text-[var(--nf-content-secondary)]"
            }`}
          >
            {typing ? "Typing..." : preview}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-inline-tight self-stretch">
          <span className={`nf-numeric ${TYPE.caption}`}>{row.whenLabel}</span>
          {row.unread > 0 ? (
            <span className="nf-inbox-row__count" aria-label={`${row.unread} unread`}>
              {row.unread}
            </span>
          ) : (
            <span aria-hidden="true" className="h-[1.375rem]" />
          )}
        </span>
      </Link>
      {onArchive && (
        <button
          type="button"
          onClick={() => onArchive(row)}
          disabled={archivePending}
          aria-label={`${row.archived ? "Move back to Recent" : "Archive"}: ${row.counterpartName}`}
          title={row.archived ? "Move back to Recent" : "Archive"}
          data-testid="inbox-archive"
          className="nf-icon-btn h-11 w-11 shrink-0 disabled:opacity-60"
        >
          <UiIcon name={row.archived ? "arrow-up" : "archive"} size={ICON.row} />
        </button>
      )}
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
  labels,
  initialSide = "property",
  archiveOpen = false,
}: {
  rows: InboxRow[];
  /** The side the app shell is on, which the inbox opens on. */
  initialSide?: Side;
  /** Archive and unarchive are live (signed in, and the table exists). */
  archiveOpen?: boolean;
  /** The three tab words, where a server parent already holds the dictionary. */
  labels?: Dictionary["uiCommon"]["inbox"];
  /** The signed-in user, for ignoring our own typing pings. Null when seeded. */
  meId?: string | null;
  /** Only a signed-in reader has read state the server can clear. */
  canMarkRead?: boolean;
}) {
  const router = useRouter();
  const [side, setSide] = useState<Side>(initialSide);
  const [view, setView] = useState<View>("recent");
  const [archiveNote, setArchiveNote] = useState<string | null>(null);
  const [archiving, startArchiving] = useTransition();
  /* Optimistic: an archived row leaves Recent the moment it is tapped. */
  const [archivedLocal, setArchivedLocal] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [markError, setMarkError] = useState<string | null>(null);
  const [marking, startMarking] = useTransition();

  /*
   * The dictionary is read here rather than passed, which is the LAST RESORT
   * the hook's own file describes and it qualifies on all three tests: this is
   * a `"use client"` control, its only server parent holds no dictionary
   * today, and the strings it needs are three tab labels. A caller that
   * acquires a `t` can still beat it by passing `tabLabels`.
   */
  const clientInbox = useClientCopy().uiCommon.inbox;
  const tabLabels = labels ?? clientInbox;

  const typing = useInboxTyping(
    rows.map((r) => r.id),
    meId,
  );

  const live = useMemo(
    () => rows.map((r) => (r.id in archivedLocal ? { ...r, archived: archivedLocal[r.id] } : r)),
    [rows, archivedLocal],
  );
  const onSide = useMemo(() => live.filter((r) => (r.side ?? "property") === side), [live, side]);
  const requests = useMemo(() => onSide.filter((r) => inView(r, "requests")), [onSide]);
  const unreadTotal = rows.reduce((sum, r) => sum + r.unread, 0);
  const unreadBySide = useMemo(() => {
    const out: Record<Side, number> = { property: 0, stays: 0 };
    for (const r of live) if (!r.archived && r.unread > 0) out[r.side ?? "property"] += 1;
    return out;
  }, [live]);

  const shown = useMemo(() => {
    const byView = onSide.filter((r) => inView(r, view));
    const q = query.trim().toLowerCase();
    if (q.length === 0) return byView;
    return byView.filter((r) =>
      `${r.counterpartName} ${r.listingTitle ?? ""} ${r.lastMessage}`
        .toLowerCase()
        .includes(q),
    );
  }, [view, query, onSide]);

  const toggleArchive = (row: InboxRow) => {
    const next = !row.archived;
    setArchiveNote(null);
    setArchivedLocal((current) => ({ ...current, [row.id]: next }));
    startArchiving(async () => {
      const result = next
        ? await archiveConversation({ conversationId: row.id })
        : await unarchiveConversation({ conversationId: row.id });
      if (!result.ok) {
        setArchivedLocal((current) => ({ ...current, [row.id]: !next }));
        setArchiveNote(result.error);
        return;
      }
      setArchiveNote(next ? `Archived. It is under Archived, and ${row.counterpartName} still sees it.` : "Moved back to Recent.");
      router.refresh();
    });
  };

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
        Vallo starts from a property, because the thread is with the agent
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

      {/* ------------------------------------------------ side, then view */}
      {/*
        The SIDE is a real tablist (it swaps the whole list), opening on the
        side the shell is on, each tab carrying how many of its threads are
        unread. The VIEW is a radiogroup of chips beneath it: a filter over
        that side's list, four equal cells so every word is whole at 390px.
      */}
      <div className="mt-heading">
        <Segmented<Side>
          label="Conversations by side"
          full
          options={SIDE_ORDER.map((key) => ({
            value: key,
            label: SIDE_LABEL[key],
            ...(unreadBySide[key] > 0 ? { count: unreadBySide[key] } : null),
          }))}
          value={side}
          onChange={setSide}
          itemIdPrefix="inbox-side"
        />
      </div>
      <div className="mt-sm" data-testid="inbox-views">
        <div role="radiogroup" aria-label={tabLabels.filterLabel} className="grid grid-cols-4 gap-2xs">
          {VIEW_ORDER.map((key) => (
            <Chip
              key={key}
              behaviour="choice"
              selected={view === key}
              onSelectedChange={() => setView(key)}
              data-testid={`inbox-view-${key}`}
              className="w-full min-w-0 justify-center px-2xs"
            >
              {key === "requests" ? tabLabels.requests : VIEW_LABEL[key]}
              {key === "requests" && requests.length > 0 ? ` ${requests.length}` : ""}
            </Chip>
          ))}
        </div>
      </div>

      {archiveNote && (
        <p role="status" className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]" data-testid="inbox-archive-note">
          {archiveNote}
        </p>
      )}

      {markError && (
        /* Rose, not cyan: `--nf-state-warning` is the pending token under
           another name, and a write that did not happen is not in flight. */
        <p role="alert" className="nf-body-sm mt-inline text-[var(--nf-state-error)]">
          {markError}
        </p>
      )}

      {/* ---------------------------------------------------------- list */}
      {/* The panel the tabs above actually control. It is keyed on the tab so
          the list re-enters rather than mutating in place, and it names its own
          tab, which is what makes the tablist a tablist. */}
      <div
        key={`${side}-${view}`}
        role="tabpanel"
        id={`inbox-panel-${side}`}
        aria-labelledby={`inbox-side-${side}`}
        className="mt-heading"
      >
        {shown.length > 0 ? (
          /* Hairline rows on the ground, not a card wrapping a divided list.
             One line between two conversations, nothing around either. */
          <ul className="flex flex-col gap-3xs">
            {shown.map((row) => (
              <Row
                key={row.id}
                row={row}
                typing={typing.has(row.id)}
                onArchive={archiveOpen && view !== "reported" ? toggleArchive : undefined}
                archivePending={archiving}
              />
            ))}
          </ul>
        ) : query.trim().length > 0 ? (
          <Empty
            title="Nothing matches that"
            body={`No conversation mentions "${query.trim()}". Try a host's name, a listing or a word from the message.`}
          />
        ) : view === "requests" ? (
          <Empty
            title="No requests waiting"
            body="A message from somebody you have never spoken to waits here first, so a stranger never lands in your main list."
          />
        ) : view === "archived" ? (
          <Empty
            title={archiveOpen ? "Nothing archived" : "Archive is not open yet"}
            body={
              archiveOpen
                ? "Archive a conversation from Recent to put it away. Only you stop seeing it there; the other person still has it, and a new reply brings it back."
                : "Soon you will be able to put conversations away here. Nothing you have is hidden in the meantime."
            }
          />
        ) : view === "reported" ? (
          <Empty
            title="Nothing reported"
            body="A conversation you report, or one with a person you reported, is listed here so you can find it again."
          />
        ) : onSide.length === 0 ? (
          side === "stays" ? (
            <Empty
              title="No stay conversations yet"
              body="Message a hotel or a restaurant, or book a stay. The conversation appears here with the place attached."
              action={{ href: "/stays", label: "Find a stay" }}
            />
          ) : (
            <Empty
              title="No conversations yet"
              body="Open any property and tap Message agent. The thread appears here, with the property attached, so nobody has to ask which one you mean."
              action={{ href: "/search", label: "Find a place" }}
            />
          )
        ) : (
          <Empty
            title="Nothing in Recent"
            body="Everything on this side is a request or archived. Reply to a request and it moves here."
          />
        )}
      </div>
    </div>
  );
}
