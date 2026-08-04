"use client";

import { useActionState, useId, useState } from "react";
import { removeReviewReply, replyToReview, type ReplyReceipt } from "@/lib/agent/reviews-actions";
import { REPLY_MAX } from "@/lib/agent/reviews-schema";
import type { ActionResult } from "@/lib/actions/envelope";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The host's reply, written or corrected in place.
 *
 * One review, one answer. The form starts closed when there is nothing to say
 * yet, so a console with forty reviews is a list rather than forty open
 * textareas, and it opens straight into the existing text when a host is
 * correcting one.
 *
 * The optimistic path is deliberately absent. A reply is public and permanent
 * enough that a host should see the real saved text come back, not a hopeful
 * copy of what they typed.
 */
export function ReplyForm({
  reviewId,
  existing,
  existingWhen,
}: {
  reviewId: string;
  /** The saved answer, or null when the host has not written one. */
  existing: string | null;
  /** When the saved answer was last written, e.g. "4 Aug 2026". */
  existingWhen: string | null;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<ReplyReceipt> | null, FormData>(
    replyToReview,
    null,
  );
  const [removeState, removeAction, removing] = useActionState<
    ActionResult<{ reviewId: string }> | null,
    FormData
  >(removeReviewReply, null);

  // What is actually on the record right now: the server's answer wins over the
  // props the page was rendered with, so the card is right before any reload.
  const saved = removeState?.ok ? null : state?.ok ? state.data.body : existing;
  const savedWhen = state?.ok || removeState?.ok ? null : existingWhen;
  const editing = open || (!saved && Boolean(state && !state.ok));

  if (saved && !editing) {
    return (
      <div className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] p-3.5">
        <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--nf-content-muted)]">
          <UiIcon name="chat-bubble" size={13} className="shrink-0" />
          Your reply
          {savedWhen && <span className="font-normal normal-case tracking-normal">{savedWhen}</span>}
        </p>
        <p className="mt-1.5 whitespace-pre-line text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {saved}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpen(true)} className="nf-btn nf-btn--glass nf-btn--sm">
            Edit reply
          </button>
          <form action={removeAction}>
            <input type="hidden" name="reviewId" value={reviewId} />
            <button
              type="submit"
              disabled={removing}
              className="nf-btn nf-btn--ghost nf-btn--sm disabled:opacity-60"
            >
              {removing ? "Removing..." : "Remove"}
            </button>
          </form>
        </div>
        {removeState && !removeState.ok && (
          <p role="alert" className="mt-2 text-[0.78rem] text-[var(--nf-state-warning)]">
            {removeState.error}
          </p>
        )}
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="nf-btn nf-btn--glass nf-btn--sm mt-3"
      >
        Write a reply
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="reviewId" value={reviewId} />
      <label htmlFor={`${uid}-body`} className="nf-label">
        Your public reply
      </label>
      <textarea
        id={`${uid}-body`}
        name="body"
        rows={3}
        maxLength={REPLY_MAX}
        defaultValue={saved ?? ""}
        placeholder="Thank them, answer the point they raised, and say what you have changed."
        aria-invalid={state && !state.ok ? true : undefined}
        className="nf-field resize-y"
      />
      <p className="mt-1.5 text-[0.75rem] text-[var(--nf-content-muted)]">
        Every guest looking at this listing will read this. The review itself cannot
        be edited, by you or by the guest.
      </p>
      {state && !state.ok && (
        <p role="alert" className="mt-1.5 text-[0.78rem] text-[var(--nf-state-warning)]">
          {state.error}
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="nf-btn nf-btn--primary nf-btn--sm disabled:opacity-60"
        >
          {pending ? "Saving..." : saved ? "Save changes" : "Post reply"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="nf-btn nf-btn--ghost nf-btn--sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
