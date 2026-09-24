import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getMyBookings } from "@/lib/bookings/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { TenancyCard } from "@/components/app/bookings/TenancyCard";
import { BookingDetailCard } from "./BookingDetailCard";
import { BookingMoneyRecord } from "@/components/app/after-gate/BookingMoneyRecord";
import { ArrivalChargesLine } from "@/components/stays/ArrivalChargesLine";
import { DoorChargeReport } from "@/components/stays/DoorChargeReport";
import { isRentChargeBooking } from "@/lib/after-gate/is-rent-charge";

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
      <PageHeader title={t.shape.plans.kinds.stay} fallback="/bookings?side=stays&from=stays" />
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
        action={<EmptyActions primary={{ label: copy.openBookings, href: "/bookings?side=stays&from=stays" }} />}
        data-testid="booking-missing"
      />,
    );
  }

  return shell(
    <>
      <BookingDetailCard booking={booking} locale={locale} />
      {/* V-20 and V-24: the terms this stay was paid under, and every refund
          with the date it is due by. Nothing at all for an unpaid stay. */}
      <BookingMoneyRecord
        bookingId={booking.id}
        checkIn={booking.checkIn}
        checkOut={booking.checkOut}
        cancelled={booking.status === "CANCELLED"}
        locale={locale}
      />
      {/* V-57: what the host declared at the door (as frozen at payment), and
          the report if asked for more. A stay only: a rent charge is settled
          in its own agreement, and every other bookings row is a nightly stay. */}
      {booking.status !== "CANCELLED" && !(await isRentChargeBooking(booking.id)) && (
        <div className="mt-lg grid gap-md">
          <ArrivalChargesLine listingId={booking.listingId} bookingId={booking.id} locale={locale} />
          {(booking.status === "CONFIRMED" || booking.status === "COMPLETED") && (
            <DoorChargeReport bookingId={booking.id} copy={t.afterTheGate.arrival} />
          )}
        </div>
      )}
    </>,
  );
}
