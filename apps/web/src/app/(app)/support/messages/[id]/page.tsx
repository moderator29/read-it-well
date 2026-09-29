import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { RetryButton } from "@/components/support/RetryButton";
import { loadMyTicket } from "@/lib/support/my-tickets";
import { hasUnread, summariseThread } from "@/lib/support/tickets";
import { MarkRead } from "./TicketActions";
import { TicketThreadView } from "./ThreadView";

export const metadata: Metadata = { title: "Support conversation" };

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
  const back = "/support/messages";

  if (read.state === "not-found") notFound();

  if (read.state === "signed-out") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Support conversation" fallback={back} />
        <EmptyState
          icon="support-chat"
          title="Sign in to read this conversation"
          body="Support conversations are kept on your account, so only you can open them."
          action={
            <ButtonLink href={`/sign-in?next=${encodeURIComponent(`/support/messages/${id}`)}`} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      </div>
    );
  }

  if (read.state === "unreadable") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Support conversation" fallback={back} />
        <EmptyState
          icon="support-chat"
          title="This conversation could not be loaded"
          body="Nothing is lost: every message is kept on your ticket. Check your connection and try again."
          action={<RetryButton />}
          secondary={
            <ButtonLink href={back} variant="ghost" size="lg">
              Back to messages
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
