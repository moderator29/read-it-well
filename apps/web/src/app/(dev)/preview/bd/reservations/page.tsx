import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { QueueFilters, QueuePager } from "@/app/admin/_components/QueueFilters";
import { adminUi } from "@/app/admin/_components/ui";
import {
  ReservationGroup,
  reservationStatusFilters,
} from "@/app/admin/bookings/reservations/ReservationCard";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import { ConsoleFrame } from "../ConsoleFrame";
import { RESERVATION_PAST, RESERVATION_REQUESTS, RESERVATION_UPCOMING } from "../fixtures";

/**
 * The reservation oversight desk on the console frame (278CC66A at 390px),
 * from fixture rows. The cards are the desk's own `ReservationGroup`, so
 * what is screenshotted is what the desk draws.
 */
export const dynamic = "force-dynamic";

const BASE = "/preview/bd/reservations";

export default async function PreviewReservations() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);
  const guestsWord = t.counts.guests;
  const requests = [...RESERVATION_REQUESTS];
  const upcoming = [...RESERVATION_UPCOMING];
  const past = [...RESERVATION_PAST];
  const shown = requests.length + upcoming.length + past.length;

  return (
    <ConsoleFrame t={t}>
      <Link href="/preview/bd" className="nf-chip mb-md inline-flex w-fit items-center gap-2xs">
        All stays
      </Link>
      <ui.QueueHeader
        title="Reservations"
        lede="Tables asked for at restaurants on Vallo. Nothing here moves money."
        count={requests.length}
      />
      <QueueFilters
        base={BASE}
        query={{}}
        common={t.admin.common}
        statuses={reservationStatusFilters(ui)}
        searchLabel="Find a table"
        searchPlaceholder="Reservation id or restaurant"
      />
      <p className="nf-caption -mt-row mb-block">The dates narrow by when the table is for.</p>
      <ReservationGroup title="Waiting on the restaurant" rows={requests} ui={ui} guestsWord={guestsWord} />
      <ReservationGroup title="Confirmed and ahead" rows={upcoming} ui={ui} guestsWord={guestsWord} />
      <ReservationGroup title="Already over or cancelled" rows={past} ui={ui} guestsWord={guestsWord} />
      <QueuePager base={BASE} query={{}} pageSize={QUEUE_PAGE_SIZE} full={false} count={shown} />
    </ConsoleFrame>
  );
}
