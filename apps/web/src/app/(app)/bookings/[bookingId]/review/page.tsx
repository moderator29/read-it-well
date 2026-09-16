import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { getReviewView, type ReviewRead } from "@/lib/reviews/queries";
import { RATING_LABELS } from "@/lib/reviews/schema";
import { ResultScreen } from "@/components/app/ResultSheet";
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
 * The screen behind the stays hub's "Leave a review" control, which until now
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
        <ResultScreen
          state="pending"
          mark="reviews"
          verdict="We cannot reach reviews right now"
          consequence="This is on our side, not yours. Nothing has been lost. Try again in a few minutes."
          actions={[{ label: "See your stays", href: "/bookings", tone: "primary" }]}
        />
      </Shell>
    );
  }

  if (read.state === "signed-out") {
    return (
      <Shell>
        <ResultScreen
          state="confirmed"
          mark="shield-check"
          verdict="Sign in to review your stay"
          consequence="Reviews are tied to the stay you took, so we need to know it was you. Sign in and you land straight back here."
          actions={[{ label: "Sign in", href: "/sign-in", tone: "primary" }]}
        />
      </Shell>
    );
  }

  if (read.state === "missing") {
    return (
      <Shell>
        {/* Rose and a cross. This said "We could not find that stay" under a
            calendar with a tick, in the pending colour. */}
        <ResultScreen
          state="failed"
          mark="seal-cross"
          verdict="We could not find that stay"
          consequence="It may belong to another account. Your stays are all in one place."
          actions={[{ label: "See your stays", href: "/bookings", tone: "primary" }]}
        />
      </Shell>
    );
  }

  if (read.state === "unavailable") {
    return (
      <Shell>
        <ResultScreen
          state="failed"
          mark="alert-triangle"
          verdict="Reviews did not load"
          consequence="Your stay is unchanged and nothing was lost. Try again in a few minutes."
          actions={[{ label: "See your stays", href: "/bookings", tone: "primary" }]}
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
        title: "The agent has not accepted yet",
        description:
          "Reviews are for stays that actually happened, so this one opens up once the agent accepts and the dates pass.",
      },
      "not-finished": {
        title: "Your stay is not finished yet",
        description: `You can share a review from ${read.subject.checkOutDisplay}, once you have checked out. Enjoy the rest of it.`,
      },
    }[read.reason];

    return (
      <Shell subtitle={read.subject.title}>
        {/* A stay that cannot be reviewed YET is a window that has not opened,
            and one that was cancelled is a window that closed. Neither is a
            failure, so neither is rose. */}
        <ResultScreen
          state={read.reason === "cancelled" ? "expired" : "pending"}
          mark="calendar-clock"
          verdict={copy.title}
          consequence={copy.description}
          actions={[
            { label: "See your stays", href: "/bookings", tone: "primary" },
            {
              label: "View the stay",
              href: `/listing/${read.subject.listingId}`,
              tone: "quiet",
            },
          ]}
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
            See your stays
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
