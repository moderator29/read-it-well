import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { getCheckoutView } from "@/lib/bookings/checkout-view";
import { isBookingReference } from "@/lib/payments/references";
import { ResultScreen } from "@/components/app/ResultSheet";
import { SegmentedProgress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { Reveal } from "@/components/site/Reveal";
import { CancellationTimeline } from "@/lib/trust/CancellationTimeline";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { panelClass } from "@/components/ui/Panel";
import { CheckoutSummary } from "./CheckoutSummary";
import { HoldCountdown } from "./HoldCountdown";
import { PayPanel } from "./PayPanel";
import { PaymentReturn } from "./PaymentReturn";
import { chargeSavedCardFor } from "./saved-card-action";
import { listPaymentMethods } from "@/lib/payments/methods-actions";
import type { PaymentMethod } from "@/lib/payments/methods";

export const metadata: Metadata = { title: "Checkout" };

/**
 * Checkout.
 *
 * The screen that turns a reserved stay into a paid one: what is being bought,
 * how long the dates are held, and the two ways to pay. Every figure is the
 * booking's own stored total in integer kobo, read under the guest's own RLS, so
 * the amount on screen is the amount the server actions charge.
 *
 * The platform charges nothing, so the total is the stay and nothing else
 * (docs/MASTER_TODO.md section 5b).
 *
 * Paystack sends the guest back to this same route as
 * ?paid=1&reference=rm-book-..., where PaymentReturn verifies the charge and
 * settles it through the identical function the webhook calls. Whichever arrives
 * first wins and the second is a no-op.
 *
 * Every state that is not "ready to pay" is a designed, honest screen: no keys
 * yet, signed out, no such booking, already paid, cancelled, or a read that
 * could not complete. None of them is a crash and none of them leaks a code.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ paid?: string; reference?: string }>;
}) {
  const { bookingId } = await params;
  const { paid, reference } = await searchParams;
  const locale = await getLocale();
  const read = await getCheckoutView(bookingId, locale);

  const settling =
    paid === "1" && typeof reference === "string" && isBookingReference(reference)
      ? reference
      : null;

  /* ------------------------------------------------------- honest states */

  if (read.state === "unconfigured") {
    return (
      <Shell>
        {/* "Payment switches on shortly" was infrastructure jargon shown to
            somebody trying to pay, and it is the most expensive instance of
            the thirteen because of who is reading it. It says what is true and
            what has happened to the money instead. */}
        <ResultScreen
          state="pending"
          mark="card-lock"
          verdict="We cannot reach payment right now"
          consequence="This is on our side, not yours. Nothing has been charged and your dates are unchanged. Try again in a few minutes."
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
          verdict="Sign in to pay for this stay"
          consequence="Your booking and its dates are kept. Sign in and you land straight back here."
          actions={[{ label: "Sign in", href: "/sign-in", tone: "primary" }]}
        />
      </Shell>
    );
  }

  if (read.state === "missing") {
    return (
      <Shell>
        {/* A CROSS, NOT A TICK, AND ROSE, NOT CYAN. This said "We could not
            find that booking" under `calendar-check`, a calendar with a TICK,
            inside a cyan glow: a success mark and the pending colour, both
            contradicting the sentence between them. */}
        <ResultScreen
          state="failed"
          mark="seal-cross"
          verdict="We could not find that booking"
          consequence="It may have been cancelled, or it belongs to another account. Your stays are all in one place."
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
          verdict="Checkout did not open"
          consequence="Your booking is unchanged and nothing has been charged. Try again in a few minutes."
          actions={[{ label: "See your stays", href: "/bookings", tone: "primary" }]}
        />
      </Shell>
    );
  }

  const view = read.view;

  /* The saved-card lane. The cards are read here, on the server, and the
     charge is bound to this booking and to one key minted per render, the
     way the wallet and hosted-card paths mint theirs inside the panel. A
     failed read offers no saved card rather than an empty group. */
  const cardsRead = await listPaymentMethods();
  const savedCards: PaymentMethod[] = cardsRead.ok ? cardsRead.data : [];
  const savedCardKey = crypto.randomUUID();
  const chargeSavedCard = chargeSavedCardFor.bind(null, bookingId, savedCardKey);

  /* ----------------------------------------------------------- the screen */

  return (
    <Shell subtitle={view.title}>
      {settling && (
        /* The sheet carries the amount and the property, because a
           confirmation is a thing people screenshot and "Payment received" on
           its own is not worth keeping. */
        <PaymentReturn
          reference={settling}
          amountMinor={view.totalMinor}
          currency={view.currency}
          subject={view.title}
          locale={locale}
          retryHref={`/checkout/${bookingId}`}
        />
      )}

      {/*
        Where you are in the booking.

        Checkout had no step indication at all - you arrived from a listing,
        were asked for money, and nothing on screen said how much further there
        was to go or that anything had already been done. Every multi-step flow
        in the reference set carries a segmented bar at the very top, and the
        agent's listing wizard already had one; this is the flow where its
        absence costs the most, because the step after it takes payment.

        Three steps, and the labels are honest about what they are: the dates
        were chosen on the listing, this screen reviews and pays, and
        confirmation follows. Not rendered while settling - a payment coming
        back from Paystack is past the point where a progress bar helps.
      */}
      {!settling && (
        <Reveal>
          <div className="mb-md">
            <SegmentedProgress
              steps={3}
              current={2}
              label="Step 2 of 3: review and pay"
            />
          </div>
        </Reveal>
      )}

      <Reveal>
        {/* What is being bought, as one component the preview harness draws
            with fixture props and this route draws with the real read. */}
        <CheckoutSummary view={view} locale={locale} />
      </Reveal>

      {view.paid ? (
        <Reveal delay={80} className="mt-md">
          <ResultScreen
            state="received"
            mark="receipt-check"
            verdict="This stay is paid for"
            consequence={`${view.totalDisplay} has been received and your dates are confirmed.`}
            actions={[{ label: "See your stays", href: "/bookings", tone: "primary" }]}
          />
        </Reveal>
      ) : view.status === "CANCELLED" ? (
        <Reveal delay={80} className="mt-md">
          {/* EXPIRED, NOT FAILED, AND NOT A TICK. A cancellation is terminal
              and it is not a failure: nothing went wrong, a window closed.
              Painting it rose would manufacture alarm, and painting it cyan
              said it was still in progress. It was also marked with a tick. */}
          <ResultScreen
            state="expired"
            verdict="This booking was cancelled"
            consequence="Cancelled stays cannot be paid for. The dates are open again, so search and reserve them afresh if you still want them."
            actions={[
              { label: "Back to the stay", href: `/listing/${view.listingId}`, tone: "primary" },
            ]}
          />
        </Reveal>
      ) : (
        <>
          <Reveal delay={80} className="mt-md">
            {/*
              ONE BRANCH PER LIFECYCLE VALUE, AND THERE ARE FIVE OF THEM NOW.

              `booking_status` gained COMPLETED and NO_SHOW. This was a single
              ternary on CONFIRMED with everything else falling through to the
              hold clock, so a stay the agent had already recorded as finished
              would have rendered a countdown towards a hold that expired days
              ago. CANCELLED is answered further up, which leaves four here and
              all four are named rather than defaulted: the next value added to
              the enum should be a visible gap, not a silently wrong screen.
            */}
            {view.status === "PENDING" ? (
              <HoldCountdown expiresAt={view.holdExpiresAt} locale={locale} />
            ) : view.status === "CONFIRMED" ? (
              /* Confirmed and still unpaid means the agent accepted a request to
                 book. There is no hold running out, so counting one down would
                 be a fiction. What this guest needs to know is that the stay is
                 theirs and the money is what is outstanding. */
              <HoldNote>
                The agent has accepted these dates, so the stay is yours. All that is left is
                paying for it, and your dates are not counting down while you do.
              </HoldNote>
            ) : view.status === "COMPLETED" ? (
              <HoldNote>
                These dates have already passed and the stay is recorded as taken. Nothing is
                counting down. The total below is what is still outstanding on it.
              </HoldNote>
            ) : (
              /* NO_SHOW. Said without accusing the reader of anything: the
                 record is the agent's and the guest may well disagree with it,
                 so the route to a person comes before the route to a payment. */
              <HoldNote>
                The agent recorded that this stay was not taken up, so nothing is counting down. If
                this total is still owed, paying settles it. If that does not match what happened,
                get help before you pay.
              </HoldNote>
            )}
          </Reveal>

          {/*
            NOT INSIDE A `Reveal`, AND THAT IS LOAD BEARING RATHER THAN A
            STYLE PREFERENCE.

            `PayPanel` now pins the pay action in an `ActionBar`, which is
            `position: fixed`. `.nf-reveal` carries a permanent `will-change:
            opacity, transform` until it is shown, and any of those properties
            makes an element the containing block for fixed descendants, so
            wrapped in one the pinned bar would anchor to this section instead
            of to the viewport and land in the wrong place at the wrong size.
            `animation.css` records the same trap catching the wallet drawer
            once already.

            It also should not fade in: this is the control the screen exists
            for, and content that only exists once an IntersectionObserver has
            fired is content that sometimes does not exist.
          */}
          <div className="mt-block">
            <PayPanel view={view} savedCards={savedCards} chargeSavedCard={chargeSavedCard} />
          </div>
        </>
      )}

      {/*
        The cancellation schedule, against THESE dates and THIS total, on the
        screen where the money moves (inbox item 66).

        The timeline component has existed for a while and rendered only on the
        cancellation page and in the safety centre, which are the two places
        somebody goes AFTER they want out. The point of a timeline rather than a
        paragraph is that it can be read in four seconds while deciding, so it
        belongs here, where the guest is about to pay and the boundary dates are
        real rather than abstract. Not shown once a stay is paid or cancelled:
        by then the schedule is support's business and there is a person on it.
      */}
      {!view.paid && view.status !== "CANCELLED" && (
        <Reveal delay={180} className="mt-xl">
          <CancellationTimeline
            checkIn={view.checkIn}
            totalMinor={view.totalMinor}
            locale={view.locale}
            headingLevel="h2"
          />
        </Reveal>
      )}

      <Reveal delay={200} className="mt-lg">
        <p className="flex items-start gap-sm text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          <span className="mt-3xs block h-5 w-5 shrink-0">
            <BrandIcon name="naira-hand" fill tile={false} />
          </span>
          <span>
            Amounts are naira, recorded to the kobo. A payment is only ever recorded once, however
            many times a page is reloaded.
          </span>
        </p>
      </Reveal>
    </Shell>
  );
}

/**
 * A standing fact about the dates, where a countdown would be a fiction.
 *
 * One component rather than three copies of the same card, because the three
 * that use it differ only in their sentence and three hand-written copies is
 * how one of them ends up a different size from the other two.
 */
function HoldNote({ children }: { children: React.ReactNode }) {
  return (
    <p className={panelClass({ variant: "card", className: "flex-row items-start gap-sm text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]" })}>
      <span className="mt-3xs block h-5 w-5 shrink-0">
        <BrandIcon name="calendar-check" fill tile={false} />
      </span>
      <span>{children}</span>
    </p>
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
    <div className="nf-cat-surface mx-auto max-w-2xl">
      <div className="relative">
        <PageScene art="calendar-check" />
        <PageHeader title="Checkout" subtitle={subtitle} fallback="/bookings" />
      </div>
      {children}
    </div>
  );
}
