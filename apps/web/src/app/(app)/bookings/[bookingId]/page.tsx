import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDictionary, plural } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getMyBookings } from "@/lib/bookings/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { EmptyState, ICON, TYPE } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { CancelBookingControl } from "@/components/app/bookings/CancelBookingSheet";
import { TenancyCard } from "@/components/app/bookings/TenancyCard";

/** A receipt for one commitment. Never indexed, and never in a tab title. */
export const metadata: Metadata = {
  title: "Booking",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * ONE BOOKING, AND THE ROUTE THAT DID NOT EXIST.
 *
 * R2 finding R2-2, confirmed critical: `components/app/messages/share.ts`
 * builds `/bookings/<id>` for a booking shared into a chat, and its own
 * comment called that "the trips hub's own detail route". There was no such
 * route. `app/(app)/bookings/` held `page.tsx` and `[bookingId]/review` and
 * nothing else, so TWO primary buttons (the booking card in a thread and the
 * thread's own context banner) ended the reservations-and-threads journey on
 * a 404, at the last tap, on the screen where somebody is checking a stay
 * they have paid for.
 *
 * It is built rather than repointed at the list. A shared card promises to
 * open the booking it shows, and a list is not that: on an account with nine
 * stays it asks the reader to find the one they were just sent.
 *
 * ---------------------------------------------------------------------------
 * THE READ, AND WHY IT IS `getMyBookings`.
 *
 * This link travels in a chat, so it reaches people who are not party to the
 * booking. `getMyBookings` reads `bookings` through the SIGNED-IN READER'S own
 * RLS-bound client, which is the only thing standing between a stranger and
 * somebody else's stay, and it is deliberately the only thing: a second
 * ownership check in this file would be a second place for the rule to live
 * and the weaker of two rules is the one that ends up enforced.
 *
 * Asking it for the whole account and picking one row costs one extra read on
 * a detail page and buys the thing that matters: `cancellable`, `reviewable`,
 * `payable` and the tenancy branch are computed in ONE place, so this page and
 * the hub can never disagree about whether a stay can still be called off.
 *
 * NOT YOURS AND NOT THERE LAND ON THE SAME PANEL, deliberately. Telling them
 * apart would confirm to somebody guessing ids that a booking exists, and the
 * two are indistinguishable to this reader anyway: neither is theirs.
 *
 * A TENANCY IS NOT A STAY HERE EITHER. A rent charge shares the bookings
 * table, so a shared link can resolve to one; it is drawn by `TenancyCard`,
 * with a move-in day and a period, and never with nights and guests.
 */
export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.catalogue.bookings;
  const loaded = await getMyBookings(locale);

  const shell = (children: React.ReactNode) => (
    <div className="nf-cat-surface mx-auto max-w-2xl">
      <PageHeader title={t.nav.bookings} fallback="/bookings" />
      <Reveal>{children}</Reveal>
    </div>
  );

  /* A read that failed says so. It must not say "not found", which would tell
     somebody their booking is gone when the database simply blinked. */
  if (loaded === "unavailable") {
    return shell(
      <div className="py-heading text-center" data-testid="booking-unavailable">
        <p className={TYPE.rowTitle}>{copy.unavailableTitle}</p>
        <p className={`mx-auto mt-row max-w-sm ${TYPE.body}`}>{copy.unavailableBody}</p>
      </div>,
    );
  }

  /* No session. The middleware sends a signed-out visitor to /sign-in before
     this file runs, so this is the unconfigured edge, and it is answered with
     the door rather than with a stranger's booking. */
  if (loaded === null) {
    return shell(
      <EmptyState
        icon="calendar-check"
        title={copy.signedOutTitle}
        body={copy.signedOutBody}
        action={
          <EmptyActions
            primary={{ label: copy.signIn, href: "/sign-in" }}
            secondary={{ label: copy.findStay, href: "/search" }}
          />
        }
        data-testid="booking-signed-out"
      />,
    );
  }

  const tenancy = loaded.rent.find((row) => row.id === bookingId);
  if (tenancy) {
    return shell(
      <ul className="grid gap-md">
        <TenancyCard tenancy={tenancy} locale={locale} />
      </ul>,
    );
  }

  const booking = [...loaded.upcoming, ...loaded.completed, ...loaded.cancelled].find(
    (row) => row.id === bookingId,
  );

  if (!booking) {
    return shell(
      <EmptyState
        icon="calendar-check"
        title={copy.detailMissingTitle}
        body={copy.detailMissingBody}
        action={<EmptyActions primary={{ label: copy.openBookings, href: "/bookings" }} />}
        data-testid="booking-missing"
      />,
    );
  }

  const where = [booking.area, booking.city].filter(Boolean).join(", ");
  const statusWords = t.admin.common.status;

  return shell(
    <article className="nf-card overflow-hidden p-0" data-testid="booking-detail">
      <div className="flex gap-md p-md">
        <Link
          href={`/listing/${booking.listingId}`}
          aria-label={booking.title}
          className="relative block h-[5.75rem] w-[5.75rem] shrink-0 overflow-hidden rounded-[var(--nf-radius-md)] bg-[var(--nf-surface-secondary)] sm:h-24 sm:w-32"
        >
          {booking.photo && (
            <Image src={booking.photo} alt="" fill sizes="128px" className="object-cover" />
          )}
        </Link>

        <div className="min-w-0 flex-1 leading-tight">
          <StatusPill tone={toneForStatus(booking.status)}>
            {statusWords[booking.status]}
          </StatusPill>
          <h1 className={`mt-xs ${TYPE.rowTitle}`}>{booking.title}</h1>
          {where && (
            <p className={`mt-2xs flex items-start gap-xs ${TYPE.rowMeta}`}>
              <UiIcon name="location" size={ICON.inline} className="mt-px shrink-0" />
              <span>{where}</span>
            </p>
          )}
          <p className={`mt-sm flex items-center gap-xs ${TYPE.body}`}>
            <UiIcon name="calendar-booking" size={ICON.inline} className="shrink-0" />
            <span className="font-medium">{booking.dateRange}</span>
          </p>
          <p className={`mt-2xs flex items-center gap-xs ${TYPE.body}`}>
            <UiIcon name="user" size={ICON.inline} className="shrink-0" />
            {plural(booking.guests, t.counts.guests, locale)} &middot;{" "}
            {plural(booking.nights, t.counts.nights, locale)}
          </p>
          {booking.arrivingName && (
            <p
              data-testid="booking-arriving"
              className="mt-2xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]"
            >
              {copy.arriving.replace("{name}", booking.arrivingName)}
              {booking.arrivingPhone && (
                <>
                  {" "}
                  &middot; <span className="nf-numeric">{booking.arrivingPhone}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-md border-t border-[var(--nf-border-subtle)] px-md py-sm">
        <p className="flex items-baseline gap-2xs">
          <span className="nf-numeric text-[length:var(--nf-text-body-sm)] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {booking.totalDisplay}
          </span>
          <span className="text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
            {copy.total}
          </span>
        </p>
        {/* The same controls the hub draws, from the same guarded facts, so a
            booking opened from a chat can be finished without a second hop. */}
        <span className="flex flex-wrap items-center gap-md">
          {booking.status === "PENDING" && (
            <ButtonLink href={`/checkout/${booking.id}`} variant="primary" size="sm">
              {copy.payNow}
            </ButtonLink>
          )}
          {booking.reviewable && (
            <Link
              href={`/bookings/${booking.id}/review`}
              className="nf-btn nf-btn--primary px-sm py-xs text-[length:var(--nf-text-caption)]"
            >
              {copy.leaveReview}
            </Link>
          )}
          {booking.reviewed && (
            <Link
              href={`/bookings/${booking.id}/review`}
              className="flex items-center gap-2xs text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
            >
              <UiIcon name="star" size={16} className="text-[var(--nf-rating)]" />
              {copy.yourReview}
            </Link>
          )}
          {booking.cancellable && (
            <CancelBookingControl booking={booking} label={copy.cancel} />
          )}
          <Link
            href={`/listing/${booking.listingId}`}
            className="flex items-center gap-2xs text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
          >
            {copy.viewDetails}
            <UiIcon name="arrow-right" size={16} />
          </Link>
        </span>
      </div>
    </article>,
  );
}
