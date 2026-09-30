import type { Locale } from "@vallo/i18n";
import type { HostReviewsRead } from "@/lib/host/reviews";
import { RATING_TREND_MIN, averageRating } from "@/lib/host/review-contest";
import { EmptyState } from "@/components/app/Screen";
import { PageHeader } from "@/components/app/PageHeader";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { HostReviewCard } from "./HostReviewCard";
import "@/app/host/host-desk.css";

/** The host's reviews, drawn (C4); the page reads, the preview harness draws fixtures. */
export function HostReviewsView({
  read,
  locale,
}: {
  read: Exclude<HostReviewsRead, { state: "signed-out" }>;
  locale: Locale;
}) {
  const tag = locale === "en" ? "en-NG" : locale;
  const when = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
  const reviews = read.state === "ok" ? read.reviews : [];
  const visible = reviews.filter((r) => !r.hiddenAt);
  const average = averageRating(visible.map((r) => r.rating));
  const counts = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: visible.filter((r) => r.rating === stars).length }));

  return (
    <>
      <PageHeader
        variant="large"
        back={false}
        title="Reviews"
        subtitle={
          read.state !== "ok"
            ? "What guests wrote about their stay"
            : reviews.length === 0
              ? "No reviews yet"
              : `${reviews.length} ${reviews.length === 1 ? "review" : "reviews"} of your stays`
        }
      />

      <div className="mt-md grid gap-md">
        {read.state === "not-ready" ? (
          <EmptyState
            icon="reviews"
            title="Reviews of hotel stays open soon"
            body="Guests will be able to review a stay at your hotel after they check out, and you will answer them here. Nothing is needed from you."
          />
        ) : read.state === "unavailable" ? (
          <p className="nf-body" role="alert">
            Your reviews could not be read just now. Refresh to try again.
          </p>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon="reviews"
            title="No reviews yet"
            body="After a guest checks out they can review their stay. It appears here, and you can answer it in public."
          />
        ) : (
          <>
            {visible.length >= RATING_TREND_MIN && average !== null ? (
              <SummaryCard
                label="Your rating"
                figure={
                  <span className="nf-numeric">
                    {average.toFixed(1)}
                    <span className="nf-caption"> of 5</span>
                  </span>
                }
                sentence={`From ${visible.length} reviews guests can read. A review we hid does not count.`}
                segments={counts
                  .filter((c) => c.count > 0)
                  .map((c) => ({
                    key: String(c.stars),
                    label: `${c.stars} star${c.stars === 1 ? "" : "s"}`,
                    count: c.count,
                    tone: c.stars >= 4 ? ("success" as const) : c.stars === 3 ? ("warning" as const) : ("error" as const),
                  }))}
                barLabel="Reviews by stars"
              />
            ) : (
              <p className="nf-caption">
                Your rating shows here once {RATING_TREND_MIN} guests have reviewed a stay. Until then each review speaks
                for itself.
              </p>
            )}
            <div className="nf-hreview-grid">
              {reviews.map((review) => (
                <HostReviewCard key={review.id} review={review} when={when.format(new Date(review.createdAt))} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
