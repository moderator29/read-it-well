"use client";

import { useActionState, useState } from "react";
import { removeReviewReply, replyToReview, type ReplyReceipt } from "@/lib/agent/reviews-actions";
import { REPLY_MAX } from "@/lib/agent/reviews-schema";
import type { ActionResult } from "@/lib/actions/envelope";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";

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
          <UiIcon name="chat-bubble" size={12} className="shrink-0" />
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
      {/*
        `aria-invalid` on a `.nf-field` changes nothing anybody can see: the
        class paints its border with a border-box gradient and the error rule
        beside it sets `border-color` underneath. A refused reply came back
        looking exactly like an unsent one. TextArea owns the invalid state and
        the message, and carries the refusal envelope's own sentence verbatim.
      */}
      <TextArea
        label="Your public reply"
        hint="Every guest looking at this listing will read this. The review itself cannot be edited, by you or by the guest."
        error={state && !state.ok ? state.error : undefined}
        name="body"
        rows={3}
        maxLength={REPLY_MAX}
        defaultValue={saved ?? ""}
        placeholder="Thank them, answer the point they raised, and say what you have changed."
      />
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="sm" loading={pending}>
          {pending ? "Saving..." : saved ? "Save changes" : "Post reply"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
