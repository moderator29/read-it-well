import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getMyBookings } from "@/lib/bookings/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { MyBookings } from "../bookings/MyBookings";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Trips" };

/**
 * Trips: the Stays side's name for your stays and reservations, by date.
 *
 * `getMyBookings` already groups upcoming, completed and cancelled, and
 * `MyBookings` already renders reservations landing from a restaurant page,
 * so Trips is that surface re-homed under the URL that keeps the Stays shell.
 * The Property side keeps `/bookings` (which also carries inspections); this
 * page carries none, because an inspection is not a trip. The date spine and
 * the interleaving of stays with reservations land with the showcase.
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
        <MyBookings groups={groups} locale={locale} justBookedId={justBooked} />
      ) : null}
    </div>
  );
}
