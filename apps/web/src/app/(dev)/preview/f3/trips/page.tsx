import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { TripSpine } from "@/app/(app)/trips/TripSpine";
import { BOOKINGS, RESERVATIONS } from "../fixtures";

/** /trips with fixture stays and a fixture table on the same spine. */
export default async function TripsPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.stays.tripsTitle} subtitle={t.stays.tripsLine} fallback="/preview/f3" />
      <TripSpine bookings={BOOKINGS} reservations={RESERVATIONS} today="2026-09-18" locale={locale} />
    </div>
  );
}
