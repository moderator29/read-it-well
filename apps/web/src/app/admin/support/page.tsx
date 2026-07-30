import type { Metadata } from "next";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getSupportTickets, getTicketThread, type TicketView } from "@/lib/admin/queries";
import { TicketReply, TicketStatusControl } from "../_components/AdminActions";
import {
  DetailRow,
  DetailSection,
  QueueEmpty,
  QueueHeader,
  QueueUnavailable,
  StatusChip,
  formatWhen,
} from "../_components/ui";

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Support tickets: the honest end of the escalation path.
 *
 * When the assistant cannot answer, it files a ticket carrying only the name
 * and email the person offered. Replying here inserts an admin message, and the
 * database trigger on that insert notifies the ticket owner, so the reply lands
 * on the platform they already use rather than in a queue nobody watches.
 */
function TicketRow({ ticket, selected }: { ticket: TicketView; selected: boolean }) {
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
          <StatusChip status={ticket.status} />
          <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
            {ticket.reference}
          </span>
        </div>
        <p className="mt-1.5 truncate text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
          {ticket.topic ?? "General question"}
        </p>
        <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--nf-content-secondary)]">
          {ticket.name} · {formatWhen(ticket.createdAt)}
        </p>
        {ticket.replyCount > 0 && (
          <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
            {ticket.replyCount === 1 ? "1 message in the thread" : `${ticket.replyCount} messages in the thread`}
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
  const params = await searchParams;
  const raw = params.ticket;
  const selectedId = typeof raw === "string" ? raw : null;

  const tickets = await getSupportTickets();

  if (tickets.state !== "ok") {
    return (
      <div className="mx-auto max-w-3xl">
        <QueueHeader title="Support" lede="Questions that needed a person." />
        <QueueUnavailable />
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
    <div className="mx-auto max-w-4xl">
      <QueueHeader
        title="Support"
        lede="Escalations carry only the name and email the person gave us. Your reply notifies them on the platform straight away."
        count={open.length}
      />

      {selected && (
        <section className="nf-card mb-6 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={selected.status} />
            <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
              {selected.reference}
            </span>
            <Link
              href="/admin/support"
              className="ml-auto inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
            >
              <UiIcon name="arrow-left" size={14} />
              All tickets
            </Link>
          </div>

          <h2 className="nf-h3 mt-2.5">{selected.topic ?? "General question"}</h2>

          <DetailSection title="Who filed it">
            <DetailRow label="Name" value={selected.name} />
            <DetailRow label="Email" value={selected.email} />
            <DetailRow
              label="Account"
              value={selected.hasAccount ? "Signed in when they filed it" : "No account attached"}
            />
            <DetailRow label="Filed" value={formatWhen(selected.createdAt)} />
          </DetailSection>

          <div className="mt-4 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] p-3">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-content-muted)]">
              What they asked
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
                      {message.senderRole === "admin" ? "RentMe support" : selected.name}
                    </span>
                    <span className="text-[0.6875rem] text-[var(--nf-content-muted)]">
                      {formatWhen(message.createdAt)}
                    </span>
                  </span>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[0.875rem] leading-relaxed text-[var(--nf-content-primary)]">
                    {message.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <TicketReply ticketId={selected.id} />
          <TicketStatusControl ticketId={selected.id} status={selected.status} />
        </section>
      )}

      {open.length === 0 && closed.length === 0 ? (
        <QueueEmpty
          title="No tickets"
          body="Nobody has needed to escalate. Tickets arrive here when the assistant cannot answer."
        />
      ) : (
        <>
          <h2 className="nf-h3 mb-3 text-[1rem]">
            {open.length > 0 ? "Waiting on us" : "No tickets waiting on us"}
          </h2>
          {open.length === 0 ? (
            <QueueEmpty
              title="Nothing waiting"
              body="Every ticket has been answered and closed."
            />
          ) : (
            <ul className="space-y-2.5">
              {open.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} selected={ticket.id === selectedId} />
              ))}
            </ul>
          )}

          {closed.length > 0 && (
            <section className="mt-8">
              <h2 className="nf-h3 mb-3 text-[1rem]">Recently closed</h2>
              <ul className="space-y-2.5">
                {closed.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} selected={ticket.id === selectedId} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
