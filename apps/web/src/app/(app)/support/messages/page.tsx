import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { RetryButton } from "@/components/support/RetryButton";
import { loadMyTickets } from "@/lib/support/my-tickets";
import { TicketListView } from "./ListView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceInbox.support.pages.listMeta };
}

/**
 * Messages: every support ticket this member filed while signed in, most
 * recently active first, each with its state in words and the last thing said.
 *
 * Read on the member's own RLS client (`lib/support/my-tickets.ts`).
 */
export default async function SupportMessagesPage() {
  const locale = await getLocale();
  const list = await loadMyTickets(50);
  const w = getDictionary(locale).experienceInbox.support.pages;
  const header = <PageHeader title={w.listTitle} subtitle={w.listSub} fallback="/support" />;

  if (list.state === "signed-out") {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <EmptyState
          icon="support-chat"
          title={w.listSignedOutTitle}
          body={w.listSignedOutBody}
          action={
            <ButtonLink href="/sign-in?next=%2Fsupport%2Fmessages" variant="primary" size="lg">
              {w.signIn}
            </ButtonLink>
          }
          secondary={
            <Link href="/help" className="nf-link-quiet inline-flex min-h-11 items-center">
              {w.helpCentre}
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
          title={w.listUnreadableTitle}
          body={w.listUnreadableBody}
          action={<RetryButton />}
          secondary={
            <Link href="/contact" className="nf-link-quiet inline-flex min-h-11 items-center">
              {w.contactInstead}
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
          title={w.listEmptyTitle}
          body={w.listEmptyBody}
          action={
            <ButtonLink href="/support/new" variant="primary" size="lg">
              {w.writeToSupport}
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
