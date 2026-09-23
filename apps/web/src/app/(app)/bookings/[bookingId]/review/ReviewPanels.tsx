import Link from "next/link";
import type { ListingReview, ReviewSubject } from "@/lib/reviews/queries";
import { RATING_LABELS } from "@/lib/reviews/schema";
import { ICON } from "@/components/app/Screen";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The two panels of `/bookings/[bookingId]/review` that are not the form:
 * the stay being reviewed, and the review already written. Lifted out of the
 * page so the orphans sweep's fixture harness draws the real markup; the page
 * still reads the stay and decides which state shows.
 */
export function ReviewSubjectPanel({ subject }: { subject: ReviewSubject }) {
  return (
    <Reveal>
      <section className="nf-card p-card">
        <h2 className="nf-h3">{subject.title}</h2>
        {subject.location.length > 0 && (
          <p className="mt-row flex items-center gap-inline nf-body-sm text-[var(--nf-content-muted)]">
            <UiIcon name="location" size={ICON.inline} className="shrink-0" />
            <span className="truncate">{subject.location}</span>
          </p>
        )}
        <p className="mt-row nf-body-sm text-[var(--nf-content-muted)]">
          You checked out on {subject.checkOutDisplay}.
        </p>
      </section>
    </Reveal>
  );
}

export function AlreadyReviewedPanel({
  subject,
  review,
}: {
  subject: ReviewSubject;
  review: ListingReview;
}) {
  return (
    <>
      <Reveal>
        <section className="nf-card p-card">
          <h2 className="nf-h3">You have already reviewed this stay</h2>
          <p className="mt-row nf-body-sm leading-relaxed text-[var(--nf-content-secondary)]">
            This is what other guests see on {subject.title}.
          </p>
  
          <div className="nf-hairline mt-block pt-block">
            <p className="flex items-center gap-xs">
              <span className="flex items-center gap-3xs" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <UiIcon
                    key={i}
                    name="star"
                    size={ICON.inline}
                    className={
                      i < review.rating
                        ? "text-[var(--nf-rating)]"
                        : "text-[var(--nf-content-muted)] opacity-40"
                    }
                  />
                ))}
              </span>
              <span className="nf-body-sm font-medium text-[var(--nf-content-secondary)]">
                {review.rating} out of 5, {RATING_LABELS[review.rating]}
              </span>
            </p>
            {review.body && (
              <p className="mt-heading nf-body leading-relaxed text-[var(--nf-content-primary)]">
                {review.body}
              </p>
            )}
            <p className="mt-heading nf-caption text-[var(--nf-content-muted)]">
              {review.author} &middot; {review.when}
            </p>
          </div>
        </section>
      </Reveal>
  
      <Reveal delay={80} className="mt-block flex flex-wrap gap-row">
        <Link
          href={`/listing/${subject.listingId}`}
          className="nf-btn nf-btn--primary"
        >
          See it on the listing
        </Link>
        <Link href="/bookings" className="nf-btn nf-btn--glass">
          See your stays
        </Link>
      </Reveal>
    </>
  );
}
