import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { RetryButton } from "@/components/support/RetryButton";
import { loadMyTicket } from "@/lib/support/my-tickets";
import { hasUnread, summariseThread } from "@/lib/support/tickets";
import { MarkRead } from "./TicketActions";
import { TicketThreadView } from "./ThreadView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceInbox.support.pages.ticketTitle };
}

/**
 * One support conversation.
 *
 * This is where a "Support replied" notification lands
 * (`private.notify_support_reply`, migration 20260928230531) and where the
 * "we have your question" notification points (migration 20260929000412).
 * The ticket, its messages and its photos are read on the member's own RLS
 * client, so another member's ticket id answers not-found, exactly like an id
 * that never existed.
 */
export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const read = await loadMyTicket(id);
  const w = getDictionary(locale).experienceInbox.support.pages;
  const back = "/support/messages";

  if (read.state === "not-found") notFound();

  if (read.state === "signed-out") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={w.ticketTitle} fallback={back} />
        <EmptyState
          icon="support-chat"
          title={w.ticketSignedOutTitle}
          body={w.ticketSignedOutBody}
          action={
            <ButtonLink href={`/sign-in?next=${encodeURIComponent(`/support/messages/${id}`)}`} variant="primary" size="lg">
              {w.signIn}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  if (read.state === "unreadable") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={w.ticketTitle} fallback={back} />
        <EmptyState
          icon="support-chat"
          title={w.ticketUnreadableTitle}
          body={w.ticketUnreadableBody}
          action={<RetryButton />}
          secondary={
            <ButtonLink href={back} variant="ghost" size="lg">
              {w.backToMessages}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  /* The thread is on screen, so a staff reply newer than the last visit is
     being read now: MarkRead stamps it after mount, and only then. */
  const summary = summariseThread(read.messages);

  return (
    <>
      <MarkRead ticketId={read.ticket.id} unread={hasUnread(summary.lastSupportAt, read.ticket.memberReadAt)} />
      <TicketThreadView ticket={read.ticket} messages={read.messages} attachments={read.attachments} locale={locale} />
    </>
  );
}
