import Link from "next/link";
import { formatRating, formatNumber, type Locale } from "@naijafinds/i18n";
import type { AgentReview, AgentReviewsSummary } from "@/lib/agent/reviews-queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ReplyForm } from "./ReplyForm";

/**
 * The host reviews console.
 *
 * A server component: the filter travels in the address bar, so the list ships
 * no JavaScript of its own and only the reply form is a client leaf.
 *
 * The opinion in the ordering is the same one the inbox takes. A host does not
 * primarily want their reviews newest first, they want the ones nobody has
 * answered, because an unanswered one-star review is the one costing them the
 * next booking. Newest wins inside that.
 */

export type ReviewsFilter = "unanswered" | "all";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <UiIcon
          key={i}
          name="star"
          size={16}
          className={
            i < rating ? "text-[var(--nf-rating)]" : "text-[var(--nf-content-muted)] opacity-40"
          }
        />
      ))}
    </span>
  );
}

function Summary({ summary, locale }: { summary: AgentReviewsSummary; locale: Locale }) {
  const most = Math.max(1, ...summary.distribution);
  return (
    <div className="nf-card p-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <span className="block h-14 w-14 shrink-0">
          <BrandIcon name="reviews" fill />
        </span>
        <p className="flex items-baseline gap-2">
          <span className="nf-numeric text-[1.75rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {formatRating(summary.average, locale)}
          </span>
          <span className="text-[0.875rem] text-[var(--nf-content-secondary)]">
            across {formatNumber(summary.total, locale)} {summary.total === 1 ? "review" : "reviews"}
          </span>
        </p>
      </div>

      <ul className="mt-4 grid gap-1.5 border-t border-[var(--nf-border-subtle)] pt-4">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.distribution[star - 1] ?? 0;
          return (
            <li key={star} className="flex items-center gap-3">
              <span className="nf-numeric w-3 shrink-0 text-[0.78rem] text-[var(--nf-content-muted)]">
                {star}
              </span>
              <span
                aria-hidden="true"
                className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-[var(--nf-radius-pill)] bg-[var(--nf-surface-secondary)]"
              >
                <span
                  className="block h-full rounded-[var(--nf-radius-pill)] bg-[var(--nf-brand-primary)]"
                  style={{ width: `${Math.round((count / most) * 100)}%` }}
                />
              </span>
              <span className="nf-numeric w-6 shrink-0 text-right text-[0.78rem] text-[var(--nf-content-muted)]">
                {count}
              </span>
              <span className="sr-only">
                {count} {count === 1 ? "review" : "reviews"} at {star}{" "}
                {star === 1 ? "star" : "stars"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewCard({ review }: { review: AgentReview }) {
  return (
    <li className="nf-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Stars rating={review.rating} />
          <span className="sr-only">{review.rating} out of 5.</span>
          <span className="text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
            {review.author}
          </span>
          <span className="text-[0.75rem] text-[var(--nf-content-muted)]">{review.when}</span>
        </p>
        {review.response === null && (
          <span className="nf-badge nf-badge--brand">Needs a reply</span>
        )}
      </div>

      <Link
        href={`/listing/${review.listingId}`}
        className="mt-1.5 flex items-center gap-1.5 text-[0.78rem] text-[var(--nf-content-muted)] hover:text-[var(--nf-content-secondary)]"
      >
        <UiIcon name="location" size={12} className="shrink-0" />
        <span className="truncate">{review.listingTitle}</span>
      </Link>

      {review.body ? (
        <p className="mt-2.5 whitespace-pre-line text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {review.body}
        </p>
      ) : (
        <p className="mt-2.5 text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
          This guest rated the stay and did not write anything.
        </p>
      )}

      <ReplyForm
        reviewId={review.id}
        existing={review.response?.body ?? null}
        existingWhen={review.response?.when ?? null}
      />
    </li>
  );
}

export function ReviewsWorkspace({
  reviews,
  summary,
  filter,
  locale,
}: {
  reviews: AgentReview[];
  summary: AgentReviewsSummary;
  filter: ReviewsFilter;
  locale: Locale;
}) {
  const shown = filter === "unanswered" ? reviews.filter((r) => r.response === null) : reviews;

  const chips: { key: ReviewsFilter; label: string; count: number }[] = [
    { key: "unanswered", label: "Needs a reply", count: summary.unanswered },
    { key: "all", label: "All reviews", count: summary.total },
  ];

  if (summary.total === 0) {
    return (
      <div className="nf-card p-8 text-center">
        <span className="mx-auto block h-16 w-16">
          <BrandIcon name="reviews" fill />
        </span>
        <p className="mt-3.5 font-semibold text-[var(--nf-content-primary)]">No reviews yet</p>
        <p className="mx-auto mt-1 max-w-[42ch] text-[0.875rem] text-[var(--nf-content-muted)]">
          A guest can review a stay once they have checked out and paid. The first
          one lands here, and you get the chance to answer it in public.
        </p>
        <Link href="/agent/listings" className="nf-btn nf-btn--glass mt-4">
          Your listings
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Summary summary={summary} locale={locale} />

      <nav aria-label="Filter reviews" className="mt-5 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = chip.key === filter;
          return (
            <Link
              key={chip.key}
              href={chip.key === "all" ? "/agent/reviews?filter=all" : "/agent/reviews"}
              aria-current={active ? "page" : undefined}
              className={`nf-chip ${active ? "nf-chip--active" : ""}`}
            >
              {chip.label}
              <span className="nf-numeric ml-1.5 opacity-70">{formatNumber(chip.count, locale)}</span>
            </Link>
          );
        })}
      </nav>

      {shown.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {shown.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      ) : (
        <div className="nf-card mt-4 p-8 text-center">
          <span className="mx-auto block h-16 w-16">
            <BrandIcon name="listing-review" fill />
          </span>
          <p className="mt-3.5 font-semibold text-[var(--nf-content-primary)]">
            Every review has your answer
          </p>
          <p className="mx-auto mt-1 max-w-[40ch] text-[0.875rem] text-[var(--nf-content-muted)]">
            A host who answers reads as a host who cares, and that is what the next
            guest is looking for on the page.
          </p>
          <Link href="/agent/reviews?filter=all" className="nf-btn nf-btn--glass mt-4">
            See all reviews
          </Link>
        </div>
      )}
    </div>
  );
}
