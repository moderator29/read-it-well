import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ReviewCard } from "@/lib/social/profile-tabs-queries";

/**
 * What guests said, on an agent's page.
 *
 * The stars are drawn in the platform's own star glyph and NOT in a borrowed
 * gold. This codebase once reached for the warning token to get a gold for
 * ratings, which meant every warning change silently restyled every rating on
 * the platform, and the brand carries no gold at all. A filled star here is
 * brand blue and an empty one is a hairline, which is the same distinction and
 * costs nothing.
 */
export function ReviewList({ reviews }: { reviews: ReviewCard[] }) {
  return (
    <ul className="flex flex-col gap-[var(--nf-social-gap)]">
      {reviews.map((review) => (
        <li key={review.id} className="nf-card nf-social-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.9rem] font-bold text-[var(--nf-content-primary)]">
              {review.authorLabel}
            </p>
            <span
              className="inline-flex items-center gap-0.5"
              aria-label={`${review.rating} out of 5`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  aria-hidden="true"
                  className={
                    star <= review.rating
                      ? "text-[var(--nf-brand-secondary)]"
                      : "text-[var(--nf-border-default)]"
                  }
                >
                  <UiIcon name="star" size={14} />
                </span>
              ))}
            </span>
          </div>
          <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
            {review.listingTitle} · {review.createdLabel}
          </p>
          {review.body ? (
            <p className="mt-2.5 text-[0.9rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {review.body}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
