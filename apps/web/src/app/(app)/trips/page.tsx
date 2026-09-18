import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getMyBookings } from "@/lib/bookings/queries";
import { getMyReservations } from "@/lib/reservations/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { TripSpine } from "./TripSpine";
import { lagosToday } from "./trip-spine";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Trips" };

/**
 * Trips: the Stays side's name for your stays and reservations, by date.
 *
 * `getMyBookings` reads the account's stays; `TripSpine` puts them in the
 * order they happen with a rule connecting them, today accented and the past
 * one tap away (research pitch 12). The Property side keeps `/bookings`
 * (which also carries inspections); this page carries none, because an
 * inspection is not a trip.
 *
 * A TABLE IS A TRIP. `getMyReservations` (lib/reservations) reads the
 * account's tables and the spine places each one at its instant beside the
 * stays, opening its own thread where the venue answers.
 */
export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const params = await searchParams;
  const justBooked = typeof params.justBooked === "string" ? params.justBooked : undefined;
  const [loaded, tables] = await Promise.all([getMyBookings(locale), getMyReservations()]);
  const unavailable = loaded === "unavailable";
  const groups = unavailable ? null : loaded;
  /* A table read that fails on its own does not take the stays down with
     it: the spine draws what it has and says nothing false. */
  const reservations = Array.isArray(tables) ? tables : [];
  const empty =
    groups !== null &&
    groups.upcoming.length === 0 &&
    groups.completed.length === 0 &&
    groups.cancelled.length === 0 &&
    reservations.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative">
        <PageScene art="luggage-check" />
        <PageHeader title={t.stays.tripsTitle} subtitle={t.stays.tripsLine} fallback="/stays" />
      </div>
      {unavailable ? (
        <div className="py-heading text-center" data-testid="trips-unavailable">
          <p className={TYPE.rowTitle}>We could not load your trips</p>
          <p className={`mx-auto mt-row max-w-sm ${TYPE.body}`}>
            Something on our side did not answer just now. Nothing has changed about your
            bookings. Reload the page and they should come straight back.
          </p>
        </div>
      ) : empty ? (
        <EmptyState
          icon="luggage-plane"
          title={t.stays.tripsEmptyTitle}
          body={t.stays.tripsEmptyBody}
          action={
            <ButtonLink href="/stays/search" variant="primary">
              {t.stays.findStay}
            </ButtonLink>
          }
        />
      ) : groups ? (
        <TripSpine
          bookings={[...groups.upcoming, ...groups.completed, ...groups.cancelled]}
          reservations={reservations}
          today={lagosToday()}
          locale={locale}
          justBookedId={justBooked}
        />
      ) : null}
    </div>
  );
}
