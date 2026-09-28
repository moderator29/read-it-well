import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { loadMyTickets } from "@/lib/support/my-tickets";
import { canMemberReply, previewText, ticketStatusCopy } from "@/lib/support/tickets";

export const metadata: Metadata = { title: "Support messages" };

/**
 * Messages: every support ticket this member filed while signed in, newest
 * first, each with its status in words and the last thing said on it.
 *
 * Read on the member's own RLS client (`lib/support/my-tickets.ts`). A row
 * where support spoke last on a ticket still being worked carries a dot and
 * the words "New reply", so the state is never colour alone.
 */
export default async function SupportMessagesPage() {
  const locale = await getLocale();
  const list = await loadMyTickets(50);
  const header = <PageHeader title="Messages" subtitle="Your support conversations" fallback="/support" />;

  if (list.state === "signed-out") {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <EmptyState
          icon="support-chat"
          title="Sign in to see your support conversations"
          body="Tickets you file while signed in, and every reply from the team, are kept here."
          action={
            <ButtonLink href="/sign-in?next=%2Fsupport%2Fmessages" variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
          secondary={
            <Link href="/help" className="nf-link-quiet inline-flex min-h-11 items-center">
              Open the help centre
            </Link>
          }
        />
      </div>
    );
  }

  if (list.state === "unreadable") {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <EmptyState
          icon="support-chat"
          title="Your conversations could not be loaded"
          body="Nothing is lost. Try again in a moment, or write to the team with the contact form."
          action={
            <ButtonLink href="/contact" variant="secondary" size="lg">
              Contact support
            </ButtonLink>
          }
        />
      </div>
    );
  }

  if (list.tickets.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <EmptyState
          icon="support-chat"
          title="No support conversations yet"
          body="When you ask the team something while signed in, the ticket and every reply appear here. A ticket filed while signed out is answered by email instead."
          action={
            <ButtonLink href="/support" variant="primary" size="lg">
              Ask a question
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {header}
      <section className="nf-sgroup" aria-label="Support conversations">
        <ul className="nf-sgroup__body nf-panel nf-panel--card" data-testid="support-ticket-list">
          {list.tickets.map((ticket) => {
            const status = ticketStatusCopy(ticket.status);
            const waiting = canMemberReply(ticket.status) && ticket.thread.supportSpokeLast;
            const last = ticket.thread.last;
            const when = formatDate(new Date(last?.createdAt ?? ticket.createdAt), locale, {
              day: "numeric",
              month: "short",
              timeZone: "Africa/Lagos",
            });
            return (
              <li key={ticket.id}>
                <Link href={`/support/messages/${ticket.id}`} className="nf-srow" data-testid="support-ticket">
                  <span className="nf-srow__body min-w-0">
                    <span className="nf-srow__label flex min-w-0 items-center gap-3xs">
                      {waiting && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--nf-brand-primary)]" aria-hidden="true" />
                      )}
                      <span className="truncate">{ticket.topic ?? "Support ticket"}</span>
                    </span>
                    <span className="nf-srow__sub break-words">
                      {last
                        ? `${last.senderRole === "admin" ? "Support" : "You"}: ${previewText(last.body, 80)}`
                        : "Waiting for a person to pick it up"}
                    </span>
                    <span className="nf-srow__sub">
                      {ticket.reference} · {when}
                      {waiting ? " · New reply" : ""}
                    </span>
                  </span>
                  <span className="nf-srow__value">
                    <StatusPill tone={status.tone} size="xs">
                      {status.label}
                    </StatusPill>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="nf-sgroup__note">Replies also arrive by email and in your notifications.</p>
      </section>
    </div>
  );
}
