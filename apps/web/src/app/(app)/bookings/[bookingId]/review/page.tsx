import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { getDictionary } from "@vallo/i18n";
import { getReviewView, type ReviewRead } from "@/lib/reviews/queries";
import { ResultScreen } from "@/components/app/ResultSheet";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { Reveal } from "@/components/site/Reveal";
import { ReviewForm } from "./ReviewForm";
import { AlreadyReviewedPanel, ReviewSubjectPanel } from "./ReviewPanels";

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
  const plans = getDictionary(locale).shape.plans;
  const read: ReviewRead = await getReviewView(bookingId, locale);

  if (read.state === "unconfigured") {
    return (
      <Shell>
        <ResultScreen
          state="pending"
          mark="reviews"
          verdict="We cannot reach reviews right now"
          consequence="This is on our side, not yours. Nothing has been lost. Try again in a few minutes."
          actions={[{ label: plans.seeStays, href: "/bookings?side=stays&from=stays", tone: "primary" }]}
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
          state="missing"
          verdict="We could not find that stay"
          consequence="It may belong to another account. Your stays are all in one place."
          actions={[{ label: plans.seeStays, href: "/bookings?side=stays&from=stays", tone: "primary" }]}
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
          actions={[{ label: plans.seeStays, href: "/bookings?side=stays&from=stays", tone: "primary" }]}
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
      "no-show": {
        title: "This stay was recorded as not attended",
        description:
          "Reviews are for stays that happened. If you did arrive, contact support from your bookings and we will look into it.",
      },
      tenancy: {
        title: "A tenancy is not reviewed as a stay",
        description:
          "Your move-in and rent are on the tenancy page. Support can help with anything about the home.",
      },
    }[read.reason];

    return (
      <Shell subtitle={read.subject.title}>
        {/* A stay that cannot be reviewed YET is a window that has not opened,
            and one that was cancelled is a window that closed. Neither is a
            failure, so neither is rose. */}
        <ResultScreen
          state={read.reason === "cancelled" || read.reason === "no-show" || read.reason === "tenancy" ? "expired" : "pending"}
          mark="calendar-clock"
          verdict={copy.title}
          consequence={copy.description}
          actions={[
            { label: plans.seeStays, href: "/bookings?side=stays&from=stays", tone: "primary" },
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
        <AlreadyReviewedPanel subject={read.subject} review={review} />
      </Shell>
    );
  }

  return (
    <Shell subtitle={read.subject.title}>
      <ReviewSubjectPanel subject={read.subject} />

      <Reveal delay={80} className="mt-block">
        <ReviewForm subject={read.subject} plansAction={{ label: plans.seeStays, href: "/bookings?side=stays&from=stays" }} />
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
        <PageHeader title="Review your stay" subtitle={subtitle} fallback="/bookings?side=stays&from=stays" />
      </div>
      {children}
    </div>
  );
}
