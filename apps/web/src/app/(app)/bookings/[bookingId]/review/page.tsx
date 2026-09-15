import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { getReviewView, type ReviewRead } from "@/lib/reviews/queries";
import { RATING_LABELS } from "@/lib/reviews/schema";
import { MomentScreen } from "@/components/app/MomentScreen";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { ICON } from "@/components/app/Screen";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = {
  title: "Review your stay",
  robots: { index: false, follow: false },
};

/**
 * Review a stay.
 *
 * The screen behind the trips hub's "Leave a review" control, which until now
 * led to the listing page and nothing to review with. Every state that is not
 * "ready to write" is a designed, honest screen with a way onward: no keys yet,
 * signed out, no such stay, the stay is not finished, the stay was cancelled,
 * or it has already been reviewed.
 *
 * Eligibility is decided by the database. This page explains the decision.
 */
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const locale = await getLocale();
  const read: ReviewRead = await getReviewView(bookingId, locale);

  if (read.state === "unconfigured") {
    return (
      <Shell>
        <MomentScreen
          variant="brand"
          icon="reviews"
          title="Reviews switch on shortly"
          description="This platform is still waiting on its keys, so there are no stays to review yet. Nothing you did was lost."
          actions={
            <Link href="/search" className="nf-btn nf-btn--primary nf-btn--lg">
              Explore stays
            </Link>
          }
        />
      </Shell>
    );
  }

  if (read.state === "signed-out") {
    return (
      <Shell>
        <MomentScreen
          variant="brand"
          icon="shield-check"
          title="Sign in to review your stay"
          description="Reviews are tied to the stay you took, so we need to know it was you. Sign in and you land straight back here."
          actions={
            <Link href="/sign-in" className="nf-btn nf-btn--primary nf-btn--lg">
              Sign in
            </Link>
          }
        />
      </Shell>
    );
  }

  if (read.state === "missing") {
    return (
      <Shell>
        <MomentScreen
          variant="warning"
          icon="calendar-check"
          title="We could not find that stay"
          description="It may belong to another account. Your trips are all in one place."
          actions={
            <Link href="/bookings" className="nf-btn nf-btn--primary nf-btn--lg">
              My trips
            </Link>
          }
        />
      </Shell>
    );
  }

  if (read.state === "unavailable") {
    return (
      <Shell>
        <MomentScreen
          variant="warning"
          icon="shield-check"
          title="Reviews are unavailable for a moment"
          description="Your stay is unchanged and nothing was lost. Please try again shortly."
          actions={
            <Link href="/bookings" className="nf-btn nf-btn--primary nf-btn--lg">
              My trips
            </Link>
          }
        />
      </Shell>
    );
  }

  if (read.state === "not-eligible") {
    const copy = {
      cancelled: {
        title: "This stay was cancelled",
        description:
          "There is nothing to review, because the stay did not go ahead. The dates are open again if you still want them.",
      },
      unconfirmed: {
        title: "The host has not accepted yet",
        description:
          "Reviews are for stays that actually happened, so this one opens up once the host accepts and the dates pass.",
      },
      "not-finished": {
        title: "Your stay is not finished yet",
        description: `You can share a review from ${read.subject.checkOutDisplay}, once you have checked out. Enjoy the rest of it.`,
      },
    }[read.reason];

    return (
      <Shell subtitle={read.subject.title}>
        <MomentScreen
          variant="brand"
          icon="calendar-clock"
          title={copy.title}
          description={copy.description}
          actions={
            <>
              <Link href="/bookings" className="nf-btn nf-btn--primary nf-btn--lg">
                My trips
              </Link>
              <Link
                href={`/listing/${read.subject.listingId}`}
                className="nf-btn nf-btn--glass nf-btn--lg"
              >
                View the stay
              </Link>
            </>
          }
        />
      </Shell>
    );
  }

  if (read.state === "already-reviewed") {
    const { review } = read;
    return (
      <Shell subtitle={read.subject.title}>
        <Reveal>
          <section className="nf-card p-card">
            <h2 className="nf-h3">You have already reviewed this stay</h2>
            <p className="mt-row nf-body-sm leading-relaxed text-[var(--nf-content-secondary)]">
              This is what other guests see on {read.subject.title}.
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
            href={`/listing/${read.subject.listingId}`}
            className="nf-btn nf-btn--primary"
          >
            See it on the listing
          </Link>
          <Link href="/bookings" className="nf-btn nf-btn--glass">
            My trips
          </Link>
        </Reveal>
      </Shell>
    );
  }

  return (
    <Shell subtitle={read.subject.title}>
      <Reveal>
        <section className="nf-card p-card">
          <h2 className="nf-h3">{read.subject.title}</h2>
          {read.subject.location.length > 0 && (
            <p className="mt-row flex items-center gap-inline nf-body-sm text-[var(--nf-content-muted)]">
              <UiIcon name="location" size={ICON.inline} className="shrink-0" />
              <span className="truncate">{read.subject.location}</span>
            </p>
          )}
          <p className="mt-row nf-body-sm text-[var(--nf-content-muted)]">
            You checked out on {read.subject.checkOutDisplay}.
          </p>
        </section>
      </Reveal>

      <Reveal delay={80} className="mt-block">
        <ReviewForm subject={read.subject} />
      </Reveal>
    </Shell>
  );
}

/** The page frame, shared by every state so the chrome never jumps. */
function Shell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative">
        <PageScene art="calendar-check" />
        <PageHeader title="Review your stay" subtitle={subtitle} fallback="/bookings" />
      </div>
      {children}
    </div>
  );
}
