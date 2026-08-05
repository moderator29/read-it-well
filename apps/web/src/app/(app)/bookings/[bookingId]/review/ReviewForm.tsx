"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/actions/envelope";
import { submitReview, type ReviewWritten } from "@/lib/reviews/actions";
import { BODY_MAX, RATING_LABELS, RATING_MAX, RATING_MIN } from "@/lib/reviews/schema";
import type { ReviewSubject } from "@/lib/reviews/queries";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { MomentScreen } from "@/components/app/MomentScreen";

/**
 * The review form.
 *
 * A five point rating that says what each point means, and an optional written
 * account. The rating is a real radio group, so a screen reader announces it as
 * one control with five choices and the keyboard moves through it with arrows
 * for free. The stars are the visual layer over that group, never a replacement
 * for it.
 *
 * On success the router refreshes before the confirmation renders, so the
 * listing behind this screen is already showing the new review by the time the
 * guest taps through to it.
 */
export function ReviewForm({ subject }: { subject: ReviewSubject }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<ReviewWritten> | null,
    FormData
  >(submitReview, null);

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  if (state?.ok) {
    return (
      <MomentScreen
        variant="success"
        icon="reviews"
        title="Thank you for the review"
        description={`Your review of ${subject.title} is live. Other guests can see it now, and the host has been told.`}
        actions={
          <>
            <Link
              href={`/listing/${state.data.listingId}`}
              className="nf-btn nf-btn--primary nf-btn--lg"
            >
              See it on the listing
            </Link>
            <Link href="/bookings" className="nf-btn nf-btn--glass nf-btn--lg">
              My trips
            </Link>
          </>
        }
      />
    );
  }

  const stars = Array.from(
    { length: RATING_MAX - RATING_MIN + 1 },
    (_, i) => RATING_MIN + i,
  );
  const remaining = BODY_MAX - body.length;

  return (
    <form action={formAction} className="nf-card p-4 sm:p-5">
      <input type="hidden" name="bookingId" value={subject.bookingId} />

      <fieldset className="border-0 p-0">
        <legend className="nf-overline text-[var(--nf-content-muted)]">
          How was the stay?
        </legend>

        <div className="mt-3 flex items-center gap-1">
          {stars.map((value) => {
            const active = rating >= value;
            return (
              <label
                key={value}
                className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--nf-radius-md)] transition-colors hover:bg-[var(--nf-surface-raised)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--nf-brand-primary)]"
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  required
                  className="sr-only"
                />
                <UiIcon
                  name="star"
                  size={28}
                  className={
                    active
                      ? "text-[var(--nf-rating)]"
                      : "text-[var(--nf-content-muted)] opacity-45"
                  }
                />
                <span className="sr-only">
                  {value} out of {RATING_MAX}, {RATING_LABELS[value]}
                </span>
              </label>
            );
          })}
        </div>

        {/* The chosen meaning, held in a live region so the change is announced
            rather than only seen. The reserved height stops the form jumping
            when the first star is picked. */}
        <p
          aria-live="polite"
          className="mt-1 min-h-[1.25rem] text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]"
        >
          {rating > 0 ? RATING_LABELS[rating] : ""}
        </p>
      </fieldset>

      <div className="mt-5">
        <label
          htmlFor="review-body"
          className="nf-overline block text-[var(--nf-content-muted)]"
        >
          Anything you would tell the next guest?
        </label>
        <textarea
          id="review-body"
          name="body"
          rows={6}
          maxLength={BODY_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Was there steady light and water? How was the host? Would you go back?"
          className="nf-field mt-2 w-full resize-y leading-relaxed"
        />
        <p className="mt-1.5 flex items-center justify-between gap-3 text-[0.75rem] text-[var(--nf-content-muted)]">
          <span>Optional. Your first name and last initial appear with it.</span>
          <span className="nf-numeric shrink-0">{remaining}</span>
        </p>
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          className="mt-4 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="nf-btn nf-btn--primary mt-5 w-full disabled:opacity-60"
      >
        {pending ? "Sharing your review..." : "Share review"}
      </button>

      <p className="mt-3 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        Reviews are public and cannot be edited once shared, so please write what
        you would want to read. Never put a bank account number in a review.
      </p>
    </form>
  );
}
