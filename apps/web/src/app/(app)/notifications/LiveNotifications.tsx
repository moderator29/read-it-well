"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import "./notifications.css";
import { PageHeader } from "@/components/app/PageHeader";
import { IconPlate, ICON_PLATE_GLYPH, type IconPlateTone } from "@/components/ui/IconPlate";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { markNotificationsRead } from "@/lib/messages/notifications-actions";
import { loadOlderNotifications } from "@/lib/notify/inbox-actions";
import { toNotificationItem, type NotificationItem } from "@/lib/notify/links";
import { lagosTimeLabel } from "@/lib/messages/time";
import {
  useNotificationsRealtime,
  type LiveNotificationRow,
} from "@/lib/messages/useRealtime";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/Screen";
import Link from "next/link";
import { bundle, type SeverityVerb, type SeverityVerdict } from "@/lib/notify/severity";
import { sectionRows } from "@/lib/notify/sections";

/**
 * The signed-in notifications inbox, in the home register.
 *
 * Server-loaded rows with realtime prepend for new arrivals. Reads are
 * optimistic: tapping an item or mark-all flips the local state instantly and
 * the action persists it; the read_at column grant means that is the only
 * field a client can ever change. A dropped socket costs nothing; the next
 * visit renders the database's truth.
 *
 * Two sections rather than a day per heading. New and Earlier is the split a
 * person actually works to: everything unread, then everything else, each with
 * its own count. Day headings looked tidy and answered a question nobody was
 * asking, which was "what did I already deal with, and on which Tuesday".
 *
 * THE ROWS ARE GLASS ROWS IN ONE CARD, with the kind's glyph on a tile at the
 * left, the way every list in the renders is drawn. Unread is said three
 * ways at once, the row's tint, the title's weight and the dot, so colour is
 * never the only signal; the tile lights with the row so the rail reads the
 * state at a glance.
 *
 * Every sentence on this screen was written by a database trigger. Follows,
 * replies, mentions, likes, reposts, badges and every moderation transition
 * all write public.notifications themselves, so this file is the surface and
 * never the source.
 */

export type { NotificationItem };

/* The round plate's tint per kind (section 17, reference 44's rating list):
   the colour sorts the list at a glance, the glyph and the words say what it
   is, so nothing rests on colour alone. */
const KIND_TONE: Record<string, IconPlateTone> = {
  booking: "brand",
  message: "info",
  wallet: "success",
  listing: "brand",
  agent: "warning",
  support: "info",
  social: "info",
  system: "neutral",
};

const KIND_ICON: Record<string, UiIconName> = {
  booking: "calendar-booking",
  message: "chat-bubble",
  wallet: "wallet",
  listing: "house",
  agent: "key",
  support: "user",
  system: "bell",
  /* Everything Around sends: a new follower, a reply, a mention, a like, a
     repost, a badge, and every moderation decision. One icon for all of them
     because they share one thing, which is that another person is on the other
     end of it. */
  social: "user",
};

function iconFor(kind: string): UiIconName {
  return KIND_ICON[kind] ?? "bell";
}

/* B11: the one verb an action row offers inline. English with the rest of
   this screen's words, which have not reached the dictionary yet. */
const VERB: Record<SeverityVerb, string> = {
  reply: "Reply",
  confirm: "Confirm",
  review: "Review",
  addDetails: "Add details",
  check: "Check",
  renew: "Renew",
  open: "Open",
};

export function LiveNotifications({
  initial,
  initialMore = false,
  userId,
  openThreads = [],
  now = 0,
}: {
  initial: NotificationItem[];
  /** True when the server read stopped at a page and older rows exist. */
  initialMore?: boolean;
  userId: string;
  /** B11: conversations that still hold an unread message for this person. */
  openThreads?: string[];
  /** The server's clock at render, so the 14-day window agrees on hydration.
      Without it (a preview) no row ages out of "Needs you". */
  now?: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [more, setMore] = useState(initialMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useNotificationsRealtime(userId, (row: LiveNotificationRow) => {
    setItems((prev) => {
      if (prev.some((n) => n.id === row.id)) return prev;
      return [toNotificationItem(row), ...prev];
    });
  });

  /*
   * Reads are optimistic, and a read that did not persist is put back.
   * Without the revert, a failed write left the row looking read on this
   * screen while the bell (a server count) went on counting it, and the two
   * disagreed until the next visit. On success the route is refreshed, which
   * re-renders the shell's server-side unread count, so the bell and this
   * list agree at once rather than on the next navigation.
   */
  const markOne = useCallback(
    (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      void markNotificationsRead({ ids: [id] }).then((result) => {
        if (result.ok) {
          router.refresh();
          return;
        }
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
      });
    },
    [router],
  );

  const markAll = useCallback(() => {
    const before = items;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setProblem(null);
    void markNotificationsRead({}).then((result) => {
      if (result.ok) {
        router.refresh();
        return;
      }
      /* Only the rows this press marked go back; anything that arrived
         over realtime in the meantime keeps its own state. */
      const unread = new Set(before.filter((n) => !n.read).map((n) => n.id));
      setItems((prev) => prev.map((n) => (unread.has(n.id) ? { ...n, read: false } : n)));
      setProblem(result.error);
    });
  }, [items, router]);

  /* Older rows, a page at a time, after the last row on screen. */
  const showOlder = useCallback(() => {
    const last = items.at(-1);
    if (!last || loadingOlder) return;
    setLoadingOlder(true);
    setProblem(null);
    /* PERF-SWEEP 8: a request that never reached the server (a dropped
       connection) used to leave the button spinning for good. It now ends
       the wait and says so, like a refused read does. */
    void loadOlderNotifications({ createdAt: last.createdAt, id: last.id })
      .then((result) => {
        setLoadingOlder(false);
        if (!result.ok) {
          setProblem(result.error);
          return;
        }
        setItems((prev) => {
          const seen = new Set(prev.map((n) => n.id));
          return [...prev, ...result.data.rows.map(toNotificationItem).filter((n) => !seen.has(n.id))];
        });
        setMore(result.data.more);
      })
      .catch(() => {
        setLoadingOlder(false);
        setProblem("Older notifications did not load. Check your connection and try again.");
      });
  }, [items, loadingOlder]);

  const unreadCount = items.filter((n) => !n.read).length;

  const header = (
    <PageHeader
      variant="large"
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
      actions={
        unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAll}
            data-testid="notifications-mark-all"
          >
            Mark all read
          </Button>
        ) : undefined
      }
    />
  );

  if (items.length === 0) {
    return (
      <div>
        {header}
        <EmptyState
          icon="bell-badge"
          title="You are all caught up"
          body="Bookings, messages, agreements and everything happening in your district land here the moment they happen."
          action={
            <ButtonLink href="/search" variant="primary">
              Find a place
            </ButtonLink>
          }
          data-testid="notifications-empty"
        />
      </div>
    );
  }

  /*
   * B11: NEEDS YOU, THEN NEW, THEN EARLIER (lib/notify/sections.ts). "Needs
   * you" holds the action rows that are still open, each with its one verb
   * inline; a row leaves it when its record is done where the record can say
   * so (a conversation with nothing unread), otherwise when it is opened.
   * Rows about one conversation or one post fold into one row that opens.
   */
  const sectioned = sectionRows(items, new Set(openThreads), now);
  const sections: { key: string; label: string; entries: { row: NotificationItem; verdict: SeverityVerdict }[] }[] = [
    { key: "needs", label: "Needs you", entries: sectioned.needsYou },
    { key: "new", label: "New", entries: sectioned.fresh },
    { key: "earlier", label: "Earlier", entries: sectioned.earlier },
  ].filter((section) => section.entries.length > 0);

  return (
    <div>
      {header}

      <div className="nf-notif">
        {sections.map((section) => {
          const verdicts = new Map(section.entries.map((e) => [e.row.id, e.verdict]));
          const bundles = bundle(section.entries.map((e) => e.row));
          return (
            /* ONE GROUPED LIST per section, rows on inset hairlines inside a
               single card (section 17), each glyph on the ROUND tinted plate
               of reference 44. Unread is the dot, the title at full weight
               and primary ink, never colour alone. */
            <ListGroup
              key={section.key}
              aria-label={section.label}
              label={section.label}
              action={
                <span
                  className="nf-notif__count nf-numeric"
                  aria-label={`${section.entries.length} in ${section.label}`}
                >
                  {section.entries.length}
                </span>
              }
              className={`nf-notif__group${section.key === "needs" ? " nf-notif__group--needs" : ""}`}
              data-testid={`notifications-${section.key}`}
            >
              {bundles.map((b) =>
                section.key === "needs" ? (
                  <NeedsRow
                    key={b.key}
                    lead={b.lead}
                    count={b.rows.length}
                    verb={verdicts.get(b.lead.id)?.verb}
                    onOpen={() => b.rows.forEach((r) => !r.read && markOne(r.id))}
                  />
                ) : b.rows.length > 1 ? (
                  <BundleRow key={b.key} rows={b.rows} onOpen={(id) => markOne(id)} />
                ) : (
                  <PlainRow key={b.key} n={b.lead} onOpen={() => markOne(b.lead.id)} />
                ),
              )}
            </ListGroup>
          );
        })}
      </div>

      {problem && (
        <p role="alert" className="nf-notif__problem" data-testid="notifications-problem">
          {problem}
        </p>
      )}

      {more && (
        <div className="nf-notif__more">
          <Button
            variant="ghost"
            size="sm"
            onClick={showOlder}
            disabled={loadingOlder}
            data-testid="notifications-older"
          >
            {loadingOlder ? "Loading older" : "Show older"}
          </Button>
        </div>
      )}
    </div>
  );
}

function plateFor(n: NotificationItem) {
  return (
    <IconPlate size="sm" shape="round" tone={KIND_TONE[n.kind] ?? "neutral"}>
      <UiIcon name={iconFor(n.kind)} size={ICON_PLATE_GLYPH.sm} />
    </IconPlate>
  );
}

function unreadMark(read: boolean) {
  return read ? undefined : (
    <>
      <span aria-hidden="true" className="nf-notif__dot" />
      <span className="sr-only">Unread</span>
    </>
  );
}

function PlainRow({ n, onOpen }: { n: NotificationItem; onOpen(): void }) {
  return (
    <ListRow
      className={n.read ? "nf-notif__row" : "nf-notif__row nf-notif__row--unread"}
      leading={plateFor(n)}
      title={n.title}
      sub={n.body || undefined}
      value={<span className="nf-notif__time nf-numeric">{lagosTimeLabel(n.createdAt)}</span>}
      status={unreadMark(n.read)}
      {...(n.href ? { href: n.href } : {})}
      onClick={onOpen}
    />
  );
}

/** "3 new messages": one row that opens to the rows it folds. */
function BundleRow({ rows, onOpen }: { rows: NotificationItem[]; onOpen(id: string): void }) {
  const [open, setOpen] = useState(false);
  const lead = rows[0]!;
  const unread = rows.some((r) => !r.read);
  const title = lead.kind === "message" ? `${rows.length} new messages` : `${rows.length} updates on one post`;
  return (
    <li className="nf-list-item">
      <button
        type="button"
        className={`nf-list-row nf-list-row--two nf-notif__row${unread ? " nf-notif__row--unread" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-testid="notification-bundle"
      >
        <span className="nf-list-row__lead">{plateFor(lead)}</span>
        <span className="nf-list-row__text">
          <span className="nf-list-row__title">{title}</span>
          <span className="nf-list-row__sub">{lead.body || lead.title}</span>
        </span>
        <span className="nf-list-row__end">
          <span className="nf-list-row__value">
            <span className="nf-notif__time nf-numeric">{lagosTimeLabel(lead.createdAt)}</span>
          </span>
          {unreadMark(!unread)}
        </span>
        <UiIcon name="chevron-down" size={16} className="nf-notif__fold" />
      </button>
      {open ? (
        <ul className="nf-notif__bundle">
          {rows.map((n) => (
            <PlainRow key={n.id} n={n} onOpen={() => onOpen(n.id)} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** A "Needs you" row: the record, and its one verb beside it. */
function NeedsRow({
  lead,
  count,
  verb,
  onOpen,
}: {
  lead: NotificationItem;
  count: number;
  verb?: SeverityVerb;
  onOpen(): void;
}) {
  const title = count > 1 && lead.kind === "message" ? `${count} new messages` : lead.title;
  const inner = (
    <>
      <span className="nf-list-row__lead">{plateFor(lead)}</span>
      <span className="nf-list-row__text">
        <span className="nf-list-row__title">{title}</span>
        {lead.body ? <span className="nf-list-row__sub">{lead.body}</span> : null}
        <span className="nf-notif__time nf-numeric">{lagosTimeLabel(lead.createdAt)}</span>
      </span>
    </>
  );
  return (
    <li className="nf-list-item">
      <div className="nf-list-row nf-list-row--two nf-notif__row nf-notif__row--unread nf-notif__needs">
        {lead.href ? (
          <Link href={lead.href} onClick={onOpen} className="nf-notif__needs-open">
            {inner}
          </Link>
        ) : (
          <div className="nf-notif__needs-open">{inner}</div>
        )}
        {verb && lead.href ? (
          <ButtonLink href={lead.href} size="sm" variant="primary" onClick={onOpen} className="nf-notif__verb">
            {VERB[verb]}
          </ButtonLink>
        ) : null}
      </div>
    </li>
  );
}
