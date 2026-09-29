import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { RetryButton } from "@/components/support/RetryButton";
import { loadMyTickets } from "@/lib/support/my-tickets";
import { TicketListView } from "./ListView";

export const metadata: Metadata = { title: "Support messages" };

/**
 * Messages: every support ticket this member filed while signed in, most
 * recently active first, each with its state in words and the last thing said.
 *
 * Read on the member's own RLS client (`lib/support/my-tickets.ts`).
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
          title="Sign in to see your conversations"
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
          body="Nothing is lost. Check your connection and try again."
          action={<RetryButton />}
          secondary={
            <Link href="/contact" className="nf-link-quiet inline-flex min-h-11 items-center">
              Use the contact form instead
            </Link>
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
          body="When you write to the team while signed in, the ticket and every reply appear here. A ticket filed while signed out is answered by email instead."
          action={
            <ButtonLink href="/support/new" variant="primary" size="lg">
              Write to support
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {header}
      <TicketListView tickets={list.tickets} locale={locale} />
    </div>
  );
}
