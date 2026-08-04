import { formatNumber, type Dictionary, type Locale } from "@naijafinds/i18n";
import type { ListingReview } from "@/lib/reviews/queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Reviews section.
 *
 * The summary shows the listing's own rating figures, and below it the written
 * reviews guests have actually left, newest first. Nothing is invented: a
 * listing with a rating but no written reviews says so plainly rather than
 * filling the space, and a listing with neither gets the zero state.
 *
 * Reviewer names come from each review row's own author_label, which a database
 * trigger writes from the reviewer's profile. The client never supplies it, and
 * no profile row has to be exposed to read it.
 */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <UiIcon
          key={i}
          name="star"
          size={13}
          className={
            i < rating
              ? "text-[var(--nf-rating)]"
              : "text-[var(--nf-content-muted)] opacity-40"
          }
        />
      ))}
    </span>
  );
}

export function ListingReviews({
  rating,
  reviewCount,
  reviews,
  locale,
  t,
}: {
  rating: number;
  reviewCount: number;
  /** Written reviews from the platform. Empty for a catalogue-only listing. */
  reviews: ListingReview[];
  locale: Locale;
  t: Dictionary;
}) {
  if (reviewCount === 0 && reviews.length === 0) {
    return (
      <div className="nf-card p-8 text-center">
        <span className="mx-auto block h-16 w-16">
          <BrandIcon name="reviews" fill />
        </span>
        <p className="mt-3.5 font-semibold text-[var(--nf-content-primary)]">No reviews yet</p>
        <p className="mx-auto mt-1 max-w-[38ch] text-[0.875rem] text-[var(--nf-content-muted)]">
          This place has not hosted a RentMe stay yet. Reviews appear here
          after verified stays.
        </p>
      </div>
    );
  }

  return (
    <div className="nf-card p-5">
      <div className="flex items-center gap-4.5">
        <span className="block h-16 w-16 shrink-0">
          <BrandIcon name="reviews" fill />
        </span>
        <p className="flex items-baseline gap-2">
          <span className="nf-numeric text-[1.375rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {rating.toFixed(1)}
          </span>
          <span className="text-[0.875rem] text-[var(--nf-content-secondary)]">
            {formatNumber(reviewCount, locale)} {t.common.reviews}
          </span>
        </p>
      </div>

      {reviews.length > 0 ? (
        <ul className="mt-4 grid gap-4 border-t border-[var(--nf-border-subtle)] pt-4">
          {reviews.map((review) => (
            <li key={review.id}>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Stars rating={review.rating} />
                <span className="sr-only">{review.rating} out of 5.</span>
                <span className="text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
                  {review.author}
                </span>
                <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
                  {review.when}
                </span>
              </p>
              {review.body && (
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                  {review.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 flex items-start gap-2 border-t border-[var(--nf-border-subtle)] pt-4 text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
          <UiIcon name="star" size={15} className="mt-0.5 shrink-0" />
          Written reviews from verified stays will appear here once guests share
          them on RentMe.
        </p>
      )}
    </div>
  );
}
