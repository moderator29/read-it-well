import type { Metadata } from "next";
import { getDictionary, plural } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getCheckoutView } from "@/lib/bookings/checkout-view";
import { isBookingReference } from "@/lib/payments/references";
import { MomentScreen } from "@/components/app/MomentScreen";
import { SegmentedProgress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { CancellationTimeline } from "@/lib/trust/CancellationTimeline";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { HoldCountdown } from "./HoldCountdown";
import { PayPanel } from "./PayPanel";
import { PaymentReturn } from "./PaymentReturn";

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
        <MomentScreen
          variant="brand"
          icon="card-lock"
          title="Payment switches on shortly"
          description="This platform is still waiting on its payment keys, so there is nothing to pay against yet. Nothing you did was lost."
          actions={
            <ButtonLink href="/search" variant="primary" size="lg">
              Explore stays
            </ButtonLink>
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
          title="Sign in to pay for this stay"
          description="Your booking and its dates are kept safe. Sign in and you land straight back here."
          actions={
            <ButtonLink href="/sign-in" variant="primary" size="lg">
              Sign in
            </ButtonLink>
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
          title="We could not find that booking"
          description="It may have been cancelled, or it belongs to another account. Your trips are all in one place."
          actions={
            <ButtonLink href="/bookings" variant="primary" size="lg">
              My bookings
            </ButtonLink>
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
          title="Checkout is unavailable for a moment"
          description="Your booking is unchanged and nothing has been charged. Please try again shortly."
          actions={
            <ButtonLink href="/bookings" variant="primary" size="lg">
              My bookings
            </ButtonLink>
          }
        />
      </Shell>
    );
  }

  const view = read.view;

  /* The guest and night counts on the summary. They were a pair of English
     ternaries sitting directly above money that was already being formatted for
     the reader's locale, which is the same half-localised screen the booking
     card had. Both now resolve their form through `Intl.PluralRules`. */
  const counts = getDictionary(locale).counts;

  /* ----------------------------------------------------------- the screen */

  return (
    <Shell subtitle={view.title}>
      {settling && <PaymentReturn reference={settling} />}

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
          <div className="mb-4">
            <SegmentedProgress
              steps={3}
              current={2}
              label="Step 2 of 3: review and pay"
            />
          </div>
        </Reveal>
      )}

      <Reveal>
        <section
          aria-labelledby="nf-checkout-summary"
          className="nf-card p-4 sm:p-5"
        >
          <h2 id="nf-checkout-summary" className="nf-h3">
            {view.title}
          </h2>
          {view.location.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
              <UiIcon name="location" size={12} className="shrink-0" />
              <span className="truncate">{view.location}</span>
            </p>
          )}

          <dl className="mt-4 grid gap-2.5 border-t border-[var(--nf-border-subtle)] pt-4">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[0.8125rem] text-[var(--nf-content-muted)]">Dates</dt>
              <dd className="text-right text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]">
                {view.dateRange}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[0.8125rem] text-[var(--nf-content-muted)]">Guests</dt>
              <dd className="text-right text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]">
                {plural(view.guests, counts.guests, locale)} &middot;{" "}
                {plural(view.nights, counts.nights, locale)}
              </dd>
            </div>
            {view.lines.map((line) => (
              <div key={line.label} className="flex items-start justify-between gap-4">
                <dt className="text-[0.8125rem] text-[var(--nf-content-muted)]">{line.label}</dt>
                <dd className="text-right text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]">
                  {/* A receipt line, so the kobo is stated rather than rounded
                      away: this column has to add up to the total below it. */}
                  <Amount
                    minorUnits={line.minor}
                    locale={locale}
                    currency={view.currency}
                    showFraction
                  />
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 border-t border-[var(--nf-border-subtle)] pt-4">
            <p className="nf-overline text-[var(--nf-content-muted)]">Total to pay</p>
            <p className="mt-1">
              <Amount
                minorUnits={view.totalMinor}
                locale={locale}
                currency={view.currency}
                showFraction
                suffix="in full"
                className="text-[clamp(2.5rem,10vw,3.75rem)] font-extrabold leading-none tracking-[-0.03em] text-[var(--nf-content-primary)]"
                secondaryClassName="text-[0.34em] font-bold text-[var(--nf-content-muted)]"
              />
            </p>
            {view.platformTakesNothing && (
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                RentMe adds nothing of its own to this total. Every naira goes to the stay.
              </p>
            )}
          </div>
        </section>
      </Reveal>

      {view.paid ? (
        <Reveal delay={80} className="mt-4">
          <MomentScreen
            variant="success"
            icon="calendar-check"
            title="This stay is paid for"
            description={`${view.totalDisplay} has been received and your dates are confirmed.`}
            actions={
              <ButtonLink href="/bookings" variant="primary" size="lg">
                View my booking
              </ButtonLink>
            }
          />
        </Reveal>
      ) : view.status === "CANCELLED" ? (
        <Reveal delay={80} className="mt-4">
          <MomentScreen
            variant="warning"
            icon="calendar-check"
            title="This booking was cancelled"
            description="Cancelled stays cannot be paid for. The dates are open again, so search and reserve them afresh if you still want them."
            actions={
              <ButtonLink href={`/listing/${view.listingId}`} variant="primary" size="lg">
                Back to the stay
              </ButtonLink>
            }
          />
        </Reveal>
      ) : (
        <>
          <Reveal delay={80} className="mt-4">
            {view.status === "CONFIRMED" ? (
              /* Confirmed and still unpaid means the host accepted a request to
                 book. There is no hold running out, so counting one down would
                 be a fiction. What this guest needs to know is that the stay is
                 theirs and the money is what is outstanding. */
              <p className="nf-card flex items-start gap-3 p-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                <span className="mt-0.5 block h-5 w-5 shrink-0">
                  <BrandIcon name="calendar-check" fill tile={false} />
                </span>
                <span>
                  The host has accepted these dates, so the stay is yours. All that is left is
                  paying for it, and your dates are not counting down while you do.
                </span>
              </p>
            ) : (
              <HoldCountdown expiresAt={view.holdExpiresAt} />
            )}
          </Reveal>

          <Reveal delay={140} className="mt-6">
            <PayPanel view={view} />
          </Reveal>
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
        <Reveal delay={180} className="mt-8">
          <CancellationTimeline
            checkIn={view.checkIn}
            totalMinor={view.totalMinor}
            locale={view.locale}
            headingLevel="h2"
          />
        </Reveal>
      )}

      <Reveal delay={200} className="mt-6">
        <p className="flex items-start gap-3 text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
          <span className="mt-0.5 block h-5 w-5 shrink-0">
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
        <PageScene art="/brand/story-booking.png" />
        <PageHeader title="Checkout" subtitle={subtitle} fallback="/bookings" />
      </div>
      {children}
    </div>
  );
}
