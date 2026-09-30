"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { answerHotelReview, contestHotelReview, withdrawHotelReviewAnswer } from "@/lib/host/review-actions";
import { CONTEST_CRITERIA, CONTEST_NOTE_MAX, contestWords, type ContestCriterion } from "@/lib/host/review-contest";
import type { HostReview } from "@/lib/host/reviews";

/**
 * ONE REVIEW OF THE HOST'S HOTEL (C4): what the guest wrote, the host's one
 * public answer (written, corrected or taken back in place), and "Ask Vallo
 * to look at this review", which opens the published criteria in a sheet.
 * A hidden review is shown to the host with the note the public sees in its
 * place, so the host always knows what a guest can read.
 */
export function HostReviewCard({ review, when }: { review: HostReview; when: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [writing, setWriting] = useState(false);
  const [reply, setReply] = useState(review.reply?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [contesting, setContesting] = useState(false);
  const [criterion, setCriterion] = useState<ContestCriterion | null>(null);
  const [note, setNote] = useState("");
  const [contestError, setContestError] = useState<string | null>(null);

  const saveReply = () =>
    start(async () => {
      setError(null);
      const result = await answerHotelReview({ reviewId: review.id, body: reply });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setWriting(false);
      router.refresh();
    });

  const withdraw = () =>
    start(async () => {
      setError(null);
      const result = await withdrawHotelReviewAnswer({ reviewId: review.id });
      if (!result.ok) setError(result.error);
      else {
        setReply("");
        router.refresh();
      }
    });

  const sendContest = () =>
    start(async () => {
      setContestError(null);
      const result = await contestHotelReview({ reviewId: review.id, criterion, note: note.trim() || undefined });
      if (!result.ok) {
        setContestError(result.error);
        return;
      }
      setContesting(false);
      router.refresh();
    });

  const openContest = review.contest?.status === "open";

  return (
    <article className="nf-hreview" data-testid="host-review">
      <header className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="nf-decide__title">{review.author}</p>
          <p className="nf-decide__sub">
            {review.place} · {when}
          </p>
        </div>
        <span className="nf-hreview__stars" aria-label={`${review.rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} {...(n > review.rating ? { "data-off": "" } : {})}>
              <UiIcon name="star" size={16} filled={n <= review.rating} />
            </span>
          ))}
        </span>
      </header>

      {review.body ? <p className="nf-hreview__body">{review.body}</p> : <p className="nf-hreview__hidden">A rating with no words.</p>}

      {review.hiddenAt ? (
        <p className="nf-hreview__hidden">
          <StatusBadge tone="neutral" kind="dot">
            Hidden
          </StatusBadge>{" "}
          Guests see instead: &ldquo;{review.hiddenNote ?? "Removed by Vallo"}&rdquo;. It no longer counts toward your rating.
        </p>
      ) : null}

      {review.contest ? (
        <p className="nf-caption">
          <StatusBadge tone={openContest ? "pending" : review.contest.status === "hidden" ? "success" : "neutral"} kind="dot">
            {openContest ? "Asked Vallo" : "Decided"}
          </StatusBadge>{" "}
          {contestWords(review.contest.status, review.contest.publicNote)}
        </p>
      ) : null}

      {review.reply && !writing ? (
        <div className="nf-hreview__reply">
          <p className="nf-section-label">Your reply</p>
          <p className="mt-2xs whitespace-pre-line">{review.reply.body}</p>
        </div>
      ) : null}

      {writing ? (
        <div className="grid gap-xs">
          <TextArea
            label="Your public reply"
            rows={4}
            maxLength={1200}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            hint="Guests read this under the review. Thank them, and say what you changed."
          />
          <div className="nf-hreview__actions">
            <Button variant="primary" size="md" loading={pending} disabled={pending || reply.trim().length === 0} onClick={saveReply}>
              {review.reply ? "Save the reply" : "Post the reply"}
            </Button>
            <Button variant="secondary" size="md" disabled={pending} onClick={() => setWriting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="nf-hreview__actions">
            <Button variant="secondary" size="md" leadingIcon="chat-bubble" disabled={pending} onClick={() => setWriting(true)}>
              {review.reply ? "Edit reply" : "Reply"}
            </Button>
          </div>
          {/* The quieter doors sit on a foot under a hairline, their words in
              line with the card's text, instead of wrapping under the reply
              button at a different indent. */}
          {review.reply || (!review.hiddenAt && !openContest) ? (
            <div className="nf-hreview__foot">
              {review.reply ? (
                <Button variant="quiet" size="md" disabled={pending} onClick={withdraw}>
                  Take the reply back
                </Button>
              ) : null}
              {!review.hiddenAt && !openContest ? (
                <Button variant="quiet" size="md" leadingIcon="flag" disabled={pending} onClick={() => setContesting(true)}>
                  Ask Vallo to look
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
      {error ? (
        <p className="nf-rcal-panel__error" role="alert">
          {error}
        </p>
      ) : null}

      <Sheet
        open={contesting}
        onOpenChange={(next) => !pending && setContesting(next)}
        title="Ask Vallo to look at this review"
        detents={[0.92]}
        footer={
          <div className="flex gap-sm">
            <Button variant="secondary" size="lg" full disabled={pending} onClick={() => setContesting(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="lg" full loading={pending} disabled={pending || !criterion} onClick={sendContest}>
              Send to Vallo
            </Button>
          </div>
        }
      >
        <div className="grid gap-md">
          <p className="nf-body">
            We keep a review that is about the stay, even a hard one. We hide a review only when it breaks one of these
            standards, and we never delete one. The review stays up while we look, and both you and the guest are told
            what we decide.
          </p>
          <fieldset className="grid gap-xs">
            <legend className="nf-section-label mb-xs">Which standard does it break?</legend>
            {CONTEST_CRITERIA.map((c) => (
              <label key={c.value} className="nf-hreview-choice">
                <input
                  type="radio"
                  name={`contest-${review.id}`}
                  value={c.value}
                  checked={criterion === c.value}
                  onChange={() => setCriterion(c.value)}
                  className="nf-hreview-choice__input"
                />
                <span className="min-w-0">
                  <span className="block font-semibold">{c.label}</span>
                  <span className="nf-caption block">{c.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <TextArea
            label="Anything we should know (optional)"
            rows={3}
            maxLength={CONTEST_NOTE_MAX}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            hint="Only Vallo reads this."
          />
          {contestError ? (
            <p className="nf-rcal-panel__error" role="alert">
              {contestError}
            </p>
          ) : null}
        </div>
      </Sheet>
    </article>
  );
}
