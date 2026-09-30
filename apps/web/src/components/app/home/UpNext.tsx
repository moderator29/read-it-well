import "server-only";

import type { Dictionary, Locale } from "@vallo/i18n/core";
import { resolveSession } from "@/lib/actions/session";
import { getMyBookings } from "@/lib/bookings/queries";
import { isFeatureEnabled } from "@/lib/flags";
import { readInspectionsForRequester } from "@/lib/inspections/queries";
import { loadConversationSummaries } from "@/lib/messages/live";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { hasUpNext, pickUpNext, viewingWhen, type UpNext as UpNextData } from "./up-next";

/**
 * "UP NEXT" ON HOME (plan item 15). A `ListGroup` under the hero band with a
 * row for each of: the next confirmed viewing, the next stay, the latest
 * unread thread. Every row is the account's own record, read through the
 * same queries the plans list and the inbox already make (no new read, no
 * new table), and a kind with nothing in it has no row. With nothing at all
 * the card is not drawn.
 *
 * Streamed: Home wraps this in a `Suspense` with no fallback, so the three
 * reads never hold up the greeting and the hero; the card arrives when they
 * answer, or never, and nothing on the screen moves to make room for an
 * empty box. Every read here fails soft (each returns empty or a failure
 * value rather than throwing), and a failed read is treated as nothing to
 * show, never as a figure.
 */
export async function UpNext({ t, locale }: { t: Dictionary; locale: Locale }) {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;

  const [asked, bookings, messagingOn, threads] = await Promise.all([
    readInspectionsForRequester(),
    getMyBookings(locale),
    isFeatureEnabled("messaging"),
    loadConversationSummaries(session.supabase, session.user).catch(() => []),
  ]);

  const next = pickUpNext({
    viewings: asked.readFailed ? [] : asked.inspections,
    stays: bookings && bookings !== "unavailable" ? bookings.upcoming : [],
    threads: messagingOn ? threads : [],
  });
  if (!hasUpNext(next)) return null;
  return <UpNextCard next={next} copy={t.directHome.upNext} />;
}

/** The card itself, pure, so a preview can draw it from a fixture. */
export function UpNextCard({
  next,
  copy,
}: {
  next: UpNextData;
  copy: Dictionary["directHome"]["upNext"];
}) {
  const { viewing, stay, thread } = next;
  return (
    <ListGroup label={copy.label} className="nf-home-upnext" data-testid="home-up-next">
      {viewing ? (
        <ListRow
          href={viewing.href}
          leading={
            <IconPlate size="sm">
              <UiIcon name="calendar-check" size={18} />
            </IconPlate>
          }
          title={viewing.title ?? copy.viewingFallback}
          sub={(viewing.with ? copy.viewingWith : copy.viewingOn)
            .replace("{when}", viewingWhen(viewing.slotAt))
            .replace("{name}", viewing.with ?? "")}
          status={
            <StatusBadge kind="status" tone="success">
              {copy.confirmed}
            </StatusBadge>
          }
          chevron
          data-testid="up-next-viewing"
        />
      ) : null}
      {stay ? (
        <ListRow
          href={stay.href}
          leading={
            <IconPlate size="sm">
              <UiIcon name="bed" size={18} />
            </IconPlate>
          }
          title={stay.title}
          sub={stay.dateRange}
          status={
            <StatusBadge kind="status" tone={stay.phase === "pending" ? "pending" : "success"}>
              {stay.phase === "now" ? copy.stayingNow : stay.phase === "confirmed" ? copy.confirmed : copy.awaitingHost}
            </StatusBadge>
          }
          chevron
          data-testid="up-next-stay"
        />
      ) : null}
      {thread ? (
        <ListRow
          href={thread.href}
          leading={
            <IconPlate size="sm">
              <UiIcon name="chat-bubble" size={18} />
            </IconPlate>
          }
          title={thread.name}
          sub={thread.about ? `${thread.about} · ${thread.lastMessage}` : thread.lastMessage}
          value={<span className="nf-home-upnext__when">{thread.whenLabel}</span>}
          trailing={
            <StatusBadge kind="count">
              <span aria-hidden="true">{thread.unread}</span>
              <span className="sr-only">{copy.unread.replace("{count}", String(thread.unread))}</span>
            </StatusBadge>
          }
          data-testid="up-next-thread"
        />
      ) : null}
    </ListGroup>
  );
}
