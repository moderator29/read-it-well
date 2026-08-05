import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getSupportTickets, getTicketThread, type TicketView } from "@/lib/admin/queries";
import { TicketReply, TicketStatusControl } from "../_components/AdminActions";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";
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
 * The contact form's first option is "Someone asked me to pay outside RentMe",
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
          "nf-card nf-card--interactive block p-3.5 sm:p-4",
          selected ? "ring-1 ring-[var(--nf-border-brand)]" : "",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ui.StatusChip status={ticket.status} />
          {awaitingUs && (
            <ui.StatusChip
              {...dueChip(ticket.createdAt, gradeForTopic(ticket.topic), common)}
            />
          )}
          <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
            {ticket.reference}
          </span>
        </div>
        {/* Never truncated: the topic is the sentence the person chose, and it
            is the whole of what this row is about. */}
        <p className="mt-1.5 text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
          {supportTopicLabel(ticket.topic) ?? copy.generalQuestion}
        </p>
        <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--nf-content-secondary)]">
          {ticket.name} · {ui.when(ticket.createdAt)}
        </p>
        {ticket.replyCount > 0 && (
          <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
            {ticket.replyCount === 1
              ? copy.threadCountOne
              : fill(copy.threadCount, { count: ticket.replyCount })}
          </p>
        )}
      </Link>
    </li>
  );
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

  const tickets = await getSupportTickets();

  if (tickets.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title={copy.title} lede={copy.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const selected = selectedId
    ? (tickets.data.find((ticket) => ticket.id === selectedId) ?? null)
    : null;
  const thread = selected ? await getTicketThread(selected.id) : null;

  const open = tickets.data.filter(
    (ticket) => ticket.status === "open" || ticket.status === "pending",
  );
  const closed = tickets.data.filter(
    (ticket) => ticket.status === "resolved" || ticket.status === "closed",
  );

  return (
    <div className="nf-console">
      <ui.QueueHeader title={copy.title} lede={copy.lede} count={open.length} />

      {selected && (
        <section className="nf-card mb-6 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <ui.StatusChip status={selected.status} />
            <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
              {selected.reference}
            </span>
            <Link
              href="/admin/support"
              className="ml-auto inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
            >
              <UiIcon name="arrow-left" size={16} />
              {copy.allTickets}
            </Link>
          </div>

          <h2 className="nf-h3 mt-2.5">
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

          <div className="mt-4 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] p-3">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-content-muted)]">
              {copy.whatTheyAsked}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[0.875rem] leading-relaxed text-[var(--nf-content-primary)]">
              {selected.body}
            </p>
          </div>

          {thread?.state === "ok" && thread.data.length > 0 && (
            <ul className="mt-3 space-y-2">
              {thread.data.map((message) => (
                <li
                  key={message.id}
                  className="rounded-[var(--nf-radius-md)] p-3"
                  style={
                    message.senderRole === "admin"
                      ? { background: "var(--nf-brand-primary-soft)" }
                      : {
                          background: "color-mix(in oklab, var(--nf-content-primary) 6%, transparent)",
                        }
                  }
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-content-muted)]">
                      {message.senderRole === "admin" ? copy.supportSender : selected.name}
                    </span>
                    <span className="text-[0.6875rem] text-[var(--nf-content-muted)]">
                      {ui.when(message.createdAt)}
                    </span>
                  </span>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[0.875rem] leading-relaxed text-[var(--nf-content-primary)]">
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

      {open.length === 0 && closed.length === 0 ? (
        <ui.QueueEmpty title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <>
          <h2 className="nf-h3 mb-3 text-[1rem]">
            {open.length > 0 ? copy.waitingOnUs : copy.noneWaitingHeading}
          </h2>
          {open.length === 0 ? (
            <ui.QueueEmpty title={copy.nothingWaitingTitle} body={copy.nothingWaitingBody} />
          ) : (
            <ul className="space-y-2.5">
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
            <section className="mt-8">
              <h2 className="nf-h3 mb-3 text-[1rem]">{common.recentlyClosed}</h2>
              <ul className="space-y-2.5">
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
    </div>
  );
}
