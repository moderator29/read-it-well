import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { TripSpine } from "@/app/(app)/trips/TripSpine";
import { BOOKINGS, RESERVATIONS } from "../fixtures";

/** /trips with fixture stays and a fixture table on the same spine. */
export default async function TripsPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    /* The wrapper `/trips` actually draws. See the note in f3/saved. A2. */
    <div className="nf-cat-surface mx-auto max-w-2xl">
      <div className="relative">
        <PageScene art="luggage-check" />
        <PageHeader
          title={t.stays.tripsTitle}
          subtitle={t.stays.tripsLine}
          fallback="/preview/f3"
        />
      </div>
      <TripSpine
        bookings={BOOKINGS}
        reservations={RESERVATIONS}
        today="2026-09-18"
        locale={locale}
      />
    </div>
  );
}
