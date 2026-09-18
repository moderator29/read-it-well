import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { MyBookings } from "@/app/(app)/bookings/MyBookings";
import { BOOKINGS } from "../fixtures";

/** /bookings with the fixture stays in their tabs. */
export default async function BookingsPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const groups = {
    upcoming: BOOKINGS.filter((b) => b.status === "CONFIRMED"),
    completed: BOOKINGS.filter((b) => b.status === "COMPLETED"),
    cancelled: [],
  };
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.bookings} fallback="/preview/f3" />
      <MyBookings groups={groups} locale={locale} />
    </div>
  );
}
