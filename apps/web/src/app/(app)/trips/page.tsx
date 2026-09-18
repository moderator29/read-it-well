import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getMyBookings } from "@/lib/bookings/queries";
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
 * A TABLE IS A TRIP AND IS NOT ON THE SPINE YET. `trip-spine.ts` already
 * orders both kinds together and the row already draws a table's glyph; what
 * is missing is the READ. `lib/reservations` (another worker's scope) has
 * `reserveTable`, `respondToReservation` and `cancelReservation` but no query
 * of a person's own reservations. When one lands as
 *
 *     export async function getMyReservations(): Promise<ReservationView[]>
 *
 * this page maps each row to a `kind: "table"` entry with its `reserved_for`
 * instant and hands it to `TripSpine` beside the stays; nothing else changes.
 * Until then the spine says what it holds and claims nothing it does not.
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
  const loaded = await getMyBookings(locale);
  const unavailable = loaded === "unavailable";
  const groups = unavailable ? null : loaded;
  const empty =
    groups !== null &&
    groups.upcoming.length === 0 &&
    groups.completed.length === 0 &&
    groups.cancelled.length === 0;

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
          today={lagosToday()}
          locale={locale}
          justBookedId={justBooked}
        />
      ) : null}
    </div>
  );
}
