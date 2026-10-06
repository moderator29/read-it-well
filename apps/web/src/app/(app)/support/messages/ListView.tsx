import Link from "next/link";
import { formatDate, type Locale } from "@vallo/i18n";
import { StatusPill } from "@/components/ui/StatusPill";
import type { TicketSummary } from "@/lib/support/my-tickets";
import { memberStateCopy, previewText } from "@/lib/support/tickets";

/**
 * The member's support tickets as rows: topic, the last thing said, the
 * reference and date, and the state as a chip in words.
 *
 * A row with a staff reply the member has not opened carries a dot, bold
 * type and the words "New reply", so unread is never colour alone.
 */
export function TicketListView({ tickets, locale }: { tickets: TicketSummary[]; locale: Locale }) {
  return (
    <section className="nf-sgroup" aria-label="Support conversations">
      <ul className="nf-sgroup__body nf-panel nf-panel--card nf-arrive-list" data-testid="support-ticket-list">
        {tickets.map((ticket) => {
          const state = memberStateCopy(ticket.status, ticket.thread.supportSpokeLast);
          const last = ticket.thread.last;
          const when = formatDate(new Date(last?.createdAt ?? ticket.createdAt), locale, {
            day: "numeric",
            month: "short",
            timeZone: "Africa/Lagos",
          });
          return (
            <li key={ticket.id}>
              <Link
                href={`/support/messages/${ticket.id}`}
                className="nf-srow"
                data-testid="support-ticket"
                data-unread={ticket.unread ? "true" : undefined}
              >
                <span className="nf-srow__body min-w-0">
                  <span className="nf-srow__label flex min-w-0 items-center gap-3xs">
                    {ticket.unread && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--nf-brand-primary)]" aria-hidden="true" />
                    )}
                    <span className={`truncate ${ticket.unread ? "font-bold" : ""}`}>{ticket.topic ?? "Support ticket"}</span>
                  </span>
                  <span className="nf-srow__sub break-words">
                    {last
                      ? `${last.senderRole === "admin" ? "Support" : "You"}: ${previewText(last.body, 80)}`
                      : "Waiting for a person to pick it up"}
                  </span>
                  <span className="nf-srow__sub">
                    {ticket.reference} · {when}
                    {ticket.unread ? " · New reply" : ""}
                  </span>
                </span>
                <span className="nf-srow__value">
                  <StatusPill tone={state.tone} size="xs">
                    {state.label}
                  </StatusPill>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="nf-sgroup__note">Replies also arrive by email and in your notifications.</p>
    </section>
  );
}
