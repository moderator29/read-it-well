import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { loadMyTicket } from "@/lib/support/my-tickets";
import { canMemberReply, orderThread, ticketStatusCopy } from "@/lib/support/tickets";
import { ReplyBox } from "./ReplyBox";

export const metadata: Metadata = { title: "Support conversation" };

function stamp(iso: string, locale: Locale): string {
  return formatDate(new Date(iso), locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

function Bubble({ from, body, at }: { from: "user" | "admin"; body: string; at: string }) {
  if (from === "user") {
    return (
      <li className="flex flex-col items-end gap-3xs">
        <p className="nf-body-sm max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[var(--nf-brand-primary)] px-sm py-xs leading-relaxed text-[var(--nf-content-on-brand)]">
          {body}
        </p>
        <span className="nf-caption text-[var(--nf-content-muted)]">You · {at}</span>
      </li>
    );
  }
  return (
    <li className="flex flex-col items-start gap-3xs" data-testid="support-reply-admin">
      <div className="flex max-w-[85%] items-end gap-row">
        <span className="h-6.5 w-6.5 shrink-0" aria-hidden="true">
          <BrandIcon name="support-chat" fill />
        </span>
        <p className="nf-body-sm min-w-0 whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] px-sm py-xs leading-relaxed text-[var(--nf-content-primary)]">
          {body}
        </p>
      </div>
      <span className="nf-caption ps-[calc(1.625rem+var(--nf-gap-row))] text-[var(--nf-content-muted)]">
        Vallo support · {at}
      </span>
    </li>
  );
}

/**
 * One support conversation: the question as filed, then every message on the
 * ticket oldest first, then a reply box while a person is still working it.
 *
 * This is where a "Support replied" notification lands
 * (`private.notify_support_reply`, migration 20260928230531). The ticket and
 * its messages are read on the member's own RLS client, so another member's
 * ticket id answers not-found, exactly like an id that never existed.
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
          body="Nothing is lost. Try again in a moment."
          action={
            <ButtonLink href={back} variant="secondary" size="lg">
              Back to messages
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const { ticket, messages } = read;
  const status = ticketStatusCopy(ticket.status);
  const thread = orderThread(messages);
  /* A ticket the chat escalated opens its thread with the same question the
     ticket row carries; drawing it twice would read as the member repeating
     themselves. */
  const opening = thread[0];
  const rest =
    opening && opening.senderRole === "user" && opening.body.trim() === ticket.body.trim() ? thread.slice(1) : thread;
  const replyable = canMemberReply(ticket.status);

  return (
    <div className="mx-auto max-w-2xl pb-[env(safe-area-inset-bottom)]">
      <PageHeader title={ticket.topic ?? "Support conversation"} subtitle={ticket.reference} fallback={back} />

      <div className="space-y-block">
        <div className="nf-panel nf-panel--card flex flex-wrap items-center justify-between gap-row p-card-sm">
          <p className="nf-body-sm min-w-0 flex-1 text-[var(--nf-content-secondary)]">{status.meaning}</p>
          <StatusPill tone={status.tone} size="xs">
            {status.label}
          </StatusPill>
        </div>

        <ol className="space-y-group" aria-label="Conversation" data-testid="support-thread">
          <Bubble from="user" body={ticket.body} at={stamp(ticket.createdAt, locale)} />
          {rest.map((message) => (
            <Bubble key={message.id} from={message.senderRole} body={message.body} at={stamp(message.createdAt, locale)} />
          ))}
        </ol>

        {rest.every((message) => message.senderRole !== "admin") && replyable && (
          <p className="nf-caption text-center text-[var(--nf-content-muted)]">
            A person will reply here and by email. You will get a notification when they do.
          </p>
        )}

        {replyable ? (
          <ReplyBox ticketId={ticket.id} />
        ) : (
          <div className="nf-panel nf-panel--card block p-card-sm">
            <p className="nf-body-sm text-[var(--nf-content-secondary)]">
              This ticket is {status.label.toLowerCase()}, so replies here are closed.
            </p>
            <Link
              href="/support"
              className="nf-link-quiet nf-body-sm mt-row inline-flex min-h-11 items-center font-semibold text-[var(--nf-content-link)]"
            >
              Ask a new question
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
