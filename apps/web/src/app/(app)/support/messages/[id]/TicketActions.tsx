"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { markMyTicketRead, rateMyTicket, reopenMyTicket, resolveMyTicket } from "@/lib/support/ticket-reply";

/**
 * Stamp the thread read once it is on screen.
 *
 * A client effect rather than a write during the server render, so a link
 * prefetch never clears the unread badge for a reply nobody has seen.
 */
export function MarkRead({ ticketId, unread }: { ticketId: string; unread: boolean }) {
  useEffect(() => {
    /* The action revalidates the inbox and the support home, so their badge
       is gone the next time they render; this screen needs no refresh. */
    if (unread) void markMyTicketRead(ticketId);
  }, [ticketId, unread]);
  return null;
}

/** "Sorted? Mark it resolved", the quiet exit under the reply box. */
export function ResolveButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="text-center">
      <p className="nf-caption text-[var(--nf-content-muted)]">Sorted already?</p>
      <Button
        variant="ghost"
        loading={pending}
        disabled={pending}
        data-testid="support-resolve"
        onClick={() =>
          start(async () => {
            const result = await resolveMyTicket(ticketId);
            if (!result.ok) setError(result.error);
            else router.refresh();
          })
        }
      >
        Mark as resolved
      </Button>
      {error && (
        <p role="alert" className="nf-caption text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}

const STAR_WORDS = ["", "Very poor", "Poor", "Okay", "Good", "Excellent"];

/**
 * Rate the resolution, one to five, with an optional comment.
 *
 * The stars are a radio group of real buttons at 44px each, and the chosen
 * one is also said in words, so the rating is never colour or shape alone.
 */
export function RateResolution({
  ticketId,
  rating,
  comment,
}: {
  ticketId: string;
  rating: number | null;
  comment: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(rating === null);
  const [stars, setStars] = useState(rating ?? 0);
  const [text, setText] = useState(comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!editing && rating) {
    return (
      <div className="nf-panel nf-panel--card block p-card-sm" data-testid="support-rated">
        <p className="nf-body-sm font-semibold text-[var(--nf-content-primary)]">
          You rated this {rating} out of 5. Thank you.
        </p>
        {comment && <p className="nf-caption mt-row break-words text-[var(--nf-content-secondary)]">“{comment}”</p>}
        <Button variant="quiet" size="sm" onClick={() => setEditing(true)} className="mt-row">
          Change your rating
        </Button>
      </div>
    );
  }

  return (
    <form
      className="nf-panel nf-panel--card block space-y-row p-card-sm"
      data-testid="support-rate"
      onSubmit={(event) => {
        event.preventDefault();
        if (stars < 1) {
          setError("Choose from one to five stars.");
          return;
        }
        setError(null);
        start(async () => {
          const result = await rateMyTicket(ticketId, { rating: stars, comment: text });
          if (!result.ok) setError(result.error);
          else {
            setEditing(false);
            router.refresh();
          }
        });
      }}
    >
      <p className="nf-body-sm font-semibold text-[var(--nf-content-primary)]" id="support-rate-label">
        How did we do?
      </p>
      <div role="radiogroup" aria-labelledby="support-rate-label" className="flex items-center gap-3xs">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} of 5, ${(STAR_WORDS[n] ?? "").toLowerCase()}`}
            onClick={() => setStars(n)}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--nf-radius-control)]"
            data-testid={`support-star-${n}`}
          >
            <UiIcon
              name="star"
              size={28}
              className={n <= stars ? "text-[var(--nf-brand-primary)] [&_*]:fill-current" : "text-[var(--nf-content-muted)]"}
            />
          </button>
        ))}
        <span className="nf-caption ms-xs text-[var(--nf-content-secondary)]" aria-live="polite">
          {STAR_WORDS[stars]}
        </span>
      </div>
      <TextArea
        label="Anything to add?"
        optionalText="Optional"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="What went well, or what we could do better"
      />
      {error && (
        <p role="alert" className="nf-caption text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" full loading={pending} disabled={pending} data-testid="support-rate-send">
        Send rating
      </Button>
    </form>
  );
}

/** Not sorted after all: reopen inside the window, with the date it closes. */
export function ReopenTicket({ ticketId, until }: { ticketId: string; until: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="nf-panel nf-panel--card block p-card-sm" data-testid="support-reopen">
      <p className="nf-body-sm font-semibold text-[var(--nf-content-primary)]">Not sorted?</p>
      <p className="nf-caption mt-row text-[var(--nf-content-secondary)]">
        Reopen this ticket and it goes back to the team with everything said so far. You can reopen it until {until}.
      </p>
      <Button
        variant="secondary"
        full
        className="mt-group"
        loading={pending}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await reopenMyTicket(ticketId);
            if (!result.ok) setError(result.error);
            else router.refresh();
          })
        }
      >
        Reopen ticket
      </Button>
      {error && (
        <p role="alert" className="nf-caption mt-row text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
