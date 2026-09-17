import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getSupportTickets, getTicketThread, type TicketView } from "@/lib/admin/queries";
import { TicketReply, TicketStatusControl } from "../_components/AdminActions";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import {
  queueNoMatch,
  QueueFilters,
  QueuePager,
  queueNarrowed,
  readQueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";
import { Constants } from "@/lib/supabase/database.types";
import { dueChip } from "../_components/due";
import { gradeForTopic, supportTopicLabel } from "@/lib/trust/support-topics";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.support.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * Support tickets: the honest end of the escalation path.
 *
 * When the assistant cannot answer, it files a ticket carrying only the name
 * and email the person offered. Replying here inserts an admin message, and the
 * database trigger on that insert notifies the ticket owner, so the reply lands
 * on the platform they already use rather than in a queue nobody watches.
 *
 * The contact form's first option is "Someone asked me to pay outside Vallo",
 * and that choice has to mean something on this side or the wording is
 * decoration. It does: the stored topic is read back through the same module
 * the form renders from, and an open ticket carrying it takes the four-hour
 * commitment /standards publishes rather than the ordinary day.
 */
function TicketRow({
  ticket,
  selected,
  copy,
  common,
  ui,
}: {
  ticket: TicketView;
  selected: boolean;
  copy: AdminCopy["support"];
  common: AdminCommon;
  ui: AdminUi;
}) {
  // Matches the page's own partition: resolved and closed are done, the other
  // two are still somebody's to answer.
  const awaitingUs = ticket.status === "open" || ticket.status === "pending";
  return (
    <li>
      <Link
        href={`/admin/support?ticket=${ticket.id}`}
        aria-current={selected ? "true" : undefined}
        className={[
          "nf-card nf-card--interactive block p-md sm:p-md",
          selected ? "ring-1 ring-[var(--nf-border-brand)]" : "",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-xs">
          <ui.StatusChip status={ticket.status} />
          {awaitingUs && (
            <ui.StatusChip
              {...dueChip(ticket.createdAt, gradeForTopic(ticket.topic), common)}
            />
          )}
          <span className="nf-numeric text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
            {ticket.reference}
          </span>
        </div>
        {/* Never truncated: the topic is the sentence the person chose, and it
            is the whole of what this row is about. */}
        <p className="mt-2xs text-[var(--nf-text-body-sm)] font-semibold leading-snug text-[var(--nf-content-primary)]">
          {supportTopicLabel(ticket.topic) ?? copy.generalQuestion}
        </p>
        {/* THE NAME WRAPS TOO, AND THE COMMENT ABOVE DID NOT COVER IT.
            "Never truncated" two lines up is true, and it is scoped to the
            topic. This line carried `truncate` and holds the requester's NAME,
            which is the other thing an operator recognises a ticket by and the
            thing they read back down a phone line. A clipped name on a support
            queue is the same fault as a clipped reference on the money screen,
            one row apart. */}
        <p className="mt-3xs text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)] [overflow-wrap:anywhere]">
          {ticket.name} · {ui.when(ticket.createdAt)}
        </p>
        {ticket.replyCount > 0 && (
          <p className="mt-2xs text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
            {ticket.replyCount === 1
              ? copy.threadCountOne
              : fill(copy.threadCount, { count: ticket.replyCount })}
          </p>
        )}
      </Link>
    </li>
  );
}

/** `support_ticket_status` is `open, pending, resolved, closed`, from the enum. */
function statusFilters(ui: AdminUi): readonly QueueStatusOption[] {
  return Constants.public.Enums.support_ticket_status.map((value) => ({
    value,
    label: ui.statusLabel(value),
  }));
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.support;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const params = await searchParams;
  const raw = params.ticket;
  const selectedId = typeof raw === "string" ? raw : null;

  /* The shared queue frame. The search takes a reference or an email address,
     which are the two things somebody on the phone can read out. `?ticket=` is
     the open thread and is deliberately NOT carried by the filter links: a
     narrowed queue is a different question from an open ticket, and keeping the
     thread pinned above a list it is no longer in reads as a mistake. */
  const query = readQueueQuery(params);
  const tickets = await getSupportTickets({
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.offset ? { offset: query.offset } : {}),
  });

  if (tickets.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title={copy.title} lede={copy.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const rows = tickets.data.rows;
  const selected = selectedId
    ? (rows.find((ticket) => ticket.id === selectedId) ?? null)
    : null;
  const thread = selected ? await getTicketThread(selected.id) : null;

  const open = rows.filter(
    (ticket) => ticket.status === "open" || ticket.status === "pending",
  );
  const closed = rows.filter(
    (ticket) => ticket.status === "resolved" || ticket.status === "closed",
  );
  /* A page past the first counts as narrowed for the empty copy. Landing on
     page three of a queue that has run out is a RESULT; "nothing has ever
     arrived here" would be a flat lie told to somebody looking at rows they
     have just paged past. `queueNarrowed` itself deliberately ignores the
     offset, because the Clear control is about the filters. */
  const narrowed = queueNarrowed(query) || (query.offset ?? 0) > 0;
  const noMatch = queueNoMatch(common);

  return (
    <div className="nf-console">
      <ui.QueueHeader title={copy.title} lede={copy.lede} count={open.length} />

      {selected && (
        <section className="nf-card mb-lg p-md sm:p-lg">
          <div className="flex flex-wrap items-center gap-xs">
            <ui.StatusChip status={selected.status} />
            <span className="nf-numeric text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
              {selected.reference}
            </span>
            <Link
              href="/admin/support"
              className="ml-auto inline-flex items-center gap-2xs text-[var(--nf-text-caption)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
            >
              <UiIcon name="arrow-left" size={16} />
              {copy.allTickets}
            </Link>
          </div>

          <h2 className="nf-h3 mt-xs">
            {supportTopicLabel(selected.topic) ?? copy.generalQuestion}
          </h2>

          <ui.DetailSection title={copy.whoFiled}>
            <ui.DetailRow label={copy.fields.name} value={selected.name} />
            <ui.DetailRow label={copy.fields.email} value={selected.email} />
            <ui.DetailRow
              label={copy.fields.account}
              value={selected.hasAccount ? copy.signedInWhenFiled : copy.noAccountAttached}
            />
            <ui.DetailRow label={copy.fields.filed} value={ui.when(selected.createdAt)} />
          </ui.DetailSection>

          <div className="mt-md rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] p-sm">
            <p className="nf-overline text-[var(--nf-content-muted)]">
              {copy.whatTheyAsked}
            </p>
            <p className="mt-2xs whitespace-pre-wrap break-words text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-primary)]">
              {selected.body}
            </p>
          </div>

          {thread?.state === "ok" && thread.data.length > 0 && (
            <ul className="mt-sm space-y-xs">
              {thread.data.map((message) => (
                <li
                  key={message.id}
                  className="rounded-[var(--nf-radius-md)] p-sm"
                  style={
                    message.senderRole === "admin"
                      ? { background: "var(--nf-brand-primary-soft)" }
                      : {
                          background: "color-mix(in oklab, var(--nf-content-primary) 6%, transparent)",
                        }
                  }
                >
                  <span className="flex flex-wrap items-center gap-xs">
                    <span className="nf-overline text-[var(--nf-content-muted)]">
                      {message.senderRole === "admin" ? copy.supportSender : selected.name}
                    </span>
                    <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                      {ui.when(message.createdAt)}
                    </span>
                  </span>
                  <p className="mt-2xs whitespace-pre-wrap break-words text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-primary)]">
                    {message.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <TicketReply ticketId={selected.id} copy={copy} />
          <TicketStatusControl ticketId={selected.id} status={selected.status} copy={copy} />
        </section>
      )}

      <QueueFilters
        base="/admin/support"
        query={query}
        common={common}
        statuses={statusFilters(ui)}
      />

      {open.length === 0 && closed.length === 0 ? (
        <ui.QueueEmpty
          title={narrowed ? noMatch.title : copy.emptyTitle}
          body={narrowed ? noMatch.body : copy.emptyBody}
          state={narrowed ? "no-match" : "never"}
        />
      ) : (
        <>
          <h2 className="nf-h3 mb-sm text-[var(--nf-text-body)]">
            {open.length > 0 ? copy.waitingOnUs : copy.noneWaitingHeading}
          </h2>
          {open.length === 0 ? (
            <ui.QueueEmpty title={copy.nothingWaitingTitle} body={copy.nothingWaitingBody} />
          ) : (
            <ul className="space-y-xs">
              {open.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  selected={ticket.id === selectedId}
                  copy={copy}
                  common={common}
                  ui={ui}
                />
              ))}
            </ul>
          )}

          {closed.length > 0 && (
            <section className="mt-xl">
              <h2 className="nf-h3 mb-sm text-[var(--nf-text-body)]">{common.recentlyClosed}</h2>
              <ul className="space-y-xs">
                {closed.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    selected={ticket.id === selectedId}
                    copy={copy}
                    common={common}
                    ui={ui}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <QueuePager
        base="/admin/support"
        query={query}
        pageSize={QUEUE_PAGE_SIZE}
        full={tickets.data.full}
        count={rows.length}
      />
    </div>
  );
}
