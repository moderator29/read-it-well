import { Fragment } from "react";
import Link from "next/link";
import { formatDate, getDictionary, type Locale } from "@vallo/i18n";
import { DayDivider } from "@/components/app/messages/ThreadDividers";
import { dayHeading, dayKeyOf } from "@/components/app/threads/day";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { TicketAttachment, TicketDetail } from "@/lib/support/my-tickets";
import {
  canMemberReply,
  canRate,
  expectedResponse,
  memberStateCopy,
  orderThread,
  reopenWindow,
  staffByline,
  summariseThread,
  type TicketMessage,
} from "@/lib/support/tickets";
import { StatusTrack } from "@/components/app/status/StatusTrack";
import { ticketTrack, type TicketStepKey } from "@/components/app/status/tracks";
import { ReplyBox } from "./ReplyBox";
import { RateResolution, ReopenTicket, ResolveButton } from "./TicketActions";
import { IconPlate } from "@/components/ui/IconPlate";

type ThreadWords = ReturnType<typeof getDictionary>["experienceInbox"]["support"]["thread"];

function ticketStep(key: TicketStepKey, status: string, w: ThreadWords): string {
  if (key === "resolved") return status === "closed" ? w.steps.closed : w.steps.resolved;
  return w.steps[key];
}

function stamp(iso: string, locale: Locale): string {
  return formatDate(new Date(iso), locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

/** The opening lines of a hand-over from the AI helper, old wording and new. */
const TRANSCRIPT_HEADS = ["Conversation with the AI helper before this ticket:", "Conversation so far:"];

function isTranscript(message: TicketMessage): boolean {
  return message.senderRole === "user" && TRANSCRIPT_HEADS.some((head) => message.body.startsWith(head));
}

function Photos({ items, w }: { items: TicketAttachment[]; w: ThreadWords }) {
  if (items.length === 0) return null;
  return (
    <span className="mt-row flex flex-wrap gap-xs">
      {items.map((item) =>
        item.url ? (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-[var(--nf-radius-sm)] border border-[var(--nf-border-subtle)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a signed private link, not an optimisable asset */}
            <img src={item.url} alt={w.photoAlt} className="h-28 w-28 object-cover" loading="lazy" />
          </a>
        ) : (
          <span
            key={item.id}
            className="nf-caption inline-flex h-28 w-28 items-center justify-center rounded-[var(--nf-radius-sm)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] p-xs text-center text-[var(--nf-content-muted)]"
          >
            {w.photoAttached}
          </span>
        ),
      )}
    </span>
  );
}

/**
 * A support message, on the same two materials as every other thread
 * (`.nf-bubble--mine` the lit primary, `.nf-bubble--theirs` the blue glass), so
 * a conversation with the team reads as a conversation and not as a form.
 */
function Bubble({
  message,
  at,
  photos,
  youLabel,
  w,
}: {
  message: Pick<TicketMessage, "senderRole" | "body" | "staffName">;
  at: string;
  photos: TicketAttachment[];
  youLabel: string;
  w: ThreadWords;
}) {
  if (message.senderRole === "user") {
    return (
      <li className="flex flex-col items-end gap-3xs">
        <div className="nf-bubble nf-bubble--mine max-w-[85%]">
          <p className="nf-bubble__body break-words">{message.body}</p>
          <Photos items={photos} w={w} />
        </div>
        <span className="nf-caption text-[var(--nf-content-muted)]">
          {youLabel} · <span className="nf-numeric">{at}</span>
        </span>
      </li>
    );
  }
  return (
    <li className="flex flex-col items-start gap-3xs" data-testid="support-reply-admin">
      <div className="flex max-w-[85%] items-end gap-row">
        <IconPlate size="sm" shape="round" tone="brand" className="shrink-0">
          <UiIcon name="headset" size={20} />
        </IconPlate>
        <div className="nf-bubble nf-bubble--theirs min-w-0">
          <p className="nf-bubble__body break-words">{message.body}</p>
          <Photos items={photos} w={w} />
        </div>
      </div>
      <span className="nf-caption ps-[calc(2.25rem+var(--nf-gap-row))] text-[var(--nf-content-muted)]">
        {staffByline(message.staffName)} · <span className="nf-numeric">{at}</span>
      </span>
    </li>
  );
}

/**
 * One support conversation: the state in words, the question as filed, the
 * AI hand-over folded away, every message oldest first with its photos, then
 * the one thing the member can do next.
 *
 * While the ticket is worked that is the reply box, with "mark as resolved"
 * quiet underneath. Once resolved it is the rating, with reopen beside it for
 * fourteen days. A closed ticket offers a new question.
 */
export function TicketThreadView({
  ticket,
  messages,
  attachments,
  locale,
  now,
}: {
  ticket: TicketDetail;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
  locale: Locale;
  /** A fixed clock for previews; the real page leaves it to `reopenWindow`. */
  now?: number;
}) {
  const words = getDictionary(locale).experienceInbox.support;
  const w = words.thread;
  const summary = summariseThread(messages);
  const state = memberStateCopy(ticket.status, summary.supportSpokeLast);
  const thread = orderThread(messages);
  /* A ticket the chat escalated can open its thread with the same question
     the ticket row carries; drawing it twice would read as the member
     repeating themselves. */
  const opening = thread[0];
  const rest =
    opening && opening.senderRole === "user" && opening.body.trim() === ticket.body.trim() ? thread.slice(1) : thread;
  const transcripts = rest.filter(isTranscript);
  const conversation = rest.filter((message) => !isTranscript(message));
  const photosFor = (messageId: string | null) => attachments.filter((a) => a.messageId === messageId);

  const replyable = canMemberReply(ticket.status);
  const reopen = reopenWindow(ticket.status, ticket.resolvedAt, now);
  const reopenUntil = reopen.open
    ? formatDate(new Date(reopen.until), locale, { day: "numeric", month: "long", timeZone: "Africa/Lagos" })
    : "";

  return (
    <div className="mx-auto max-w-2xl pb-[env(safe-area-inset-bottom)]">
      <PageHeader title={ticket.topic ?? words.pages.ticketTitle} subtitle={ticket.reference} fallback="/support/messages" />

      <div className="space-y-block">
        <section className="nf-panel nf-panel--card block p-card-sm" aria-label={w.status} data-testid="support-status">
          <div className="flex items-center justify-between gap-row">
            <StatusPill tone={state.tone} size="sm">
              {state.label}
            </StatusPill>
            <span className="nf-caption text-[var(--nf-content-muted)]">
              {ticket.kind === "problem" ? w.problemReport : w.question}
            </span>
          </div>
          <p className="nf-body-sm mt-row text-[var(--nf-content-secondary)]">{state.meaning}</p>
          {/* Where it stands, on the shared status track (spec section 14):
              filed, picked up (dated by the team's first reply), resolved. */}
          <StatusTrack
            className="mt-block"
            label={w.progress}
            testId="support-track"
            steps={ticketTrack({
              status: ticket.status,
              createdAt: ticket.createdAt,
              firstStaffReplyAt: thread.find((m) => m.senderRole === "admin")?.createdAt ?? null,
              resolvedAt: ticket.resolvedAt,
            }).map((step) => ({
              key: step.key,
              label: ticketStep(step.key, ticket.status, w),
              when: step.at ? stamp(step.at, locale) : null,
              state: step.state,
            }))}
          />
          {replyable && summary.supportSpokeLast === false && (
            <p className="nf-caption mt-row flex items-center gap-inline text-[var(--nf-content-muted)]">
              <UiIcon name="history" size={16} className="shrink-0" />
              {expectedResponse(ticket.topicCode)}
            </p>
          )}
          {ticket.related && (
            <p className="nf-caption mt-row flex items-start gap-inline text-[var(--nf-content-secondary)]" data-testid="support-status-related">
              <UiIcon name="link" size={16} className="mt-3xs shrink-0" />
              <span className="min-w-0 break-words">
                {w.about.replace("{label}", ticket.related.label)}
              </span>
            </p>
          )}
        </section>

        <ol className="space-y-group" aria-label={w.conversation} data-testid="support-thread">
          {(() => {
            /* A divider where the Lagos day changes, from the instants the
               rows carry: the opening message first, then each reply. The
               flags are worked out up front so nothing is reassigned while
               rows are drawn. */
            const instants = [ticket.createdAt, ...conversation.map((m) => m.createdAt)];
            const starts = instants.map((iso, i) => {
              const key = dayKeyOf(iso);
              return key !== null && key !== instants.slice(0, i).map(dayKeyOf).filter((k) => k !== null).at(-1);
            });
            const divider = (i: number) =>
              starts[i] ? (
                /* A plain item: role="none" on an <li> left the <ol> with a
                   child that is not a list item (axe "list"), and the day
                   heading is worth hearing between messages anyway. */
                <li>
                  <DayDivider label={dayHeading(instants[i]!, locale, getDictionary(locale).experienceInbox.thread.day, now)} />
                </li>
              ) : null;
            return (
              <>
                {divider(0)}
                <Bubble
                  message={{ senderRole: "user", body: ticket.body, staffName: null }}
                  at={stamp(ticket.createdAt, locale)}
                  photos={photosFor(null)}
                  youLabel={w.you}
                  w={w}
                />
                {transcripts.map((message) => (
                  <li key={message.id}>
                    <details className="nf-panel nf-panel--card block p-card-sm" data-testid="support-transcript">
                      <summary className="nf-body-sm flex min-h-11 cursor-pointer items-center gap-inline font-semibold text-[var(--nf-content-primary)]">
                        <UiIcon name="chat-bubble" size={16} className="shrink-0" />
                        {w.aiChat}
                      </summary>
                      <p className="nf-caption mt-row whitespace-pre-wrap break-words leading-relaxed text-[var(--nf-content-secondary)]">
                        {message.body}
                      </p>
                    </details>
                  </li>
                ))}
                {conversation.map((message, i) => (
                  <Fragment key={message.id}>
                    {divider(i + 1)}
                    <Bubble
                      message={message}
                      at={stamp(message.createdAt, locale)}
                      photos={photosFor(message.id)}
                      youLabel={w.you}
                  w={w}
                    />
                  </Fragment>
                ))}
              </>
            );
          })()}
        </ol>

        {replyable && summary.supportReplies === 0 && (
          <p className="nf-caption text-center text-[var(--nf-content-muted)]">
            {w.personWillReply}
          </p>
        )}

        {replyable ? (
          <>
            <ReplyBox ticketId={ticket.id} copy={words.reply} />
            <ResolveButton ticketId={ticket.id} copy={words.actions} />
          </>
        ) : (
          <>
            {canRate(ticket.status) && (
              <RateResolution ticketId={ticket.id} rating={ticket.rating} comment={ticket.ratingComment} copy={words.actions} />
            )}
            {reopen.open && <ReopenTicket ticketId={ticket.id} until={reopenUntil} copy={words.actions} />}
            <p className="text-center">
              <Link
                href="/support/new"
                className="nf-link-quiet nf-body-sm inline-flex min-h-11 items-center font-semibold text-[var(--nf-content-link)]"
              >
                {w.askNew}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
