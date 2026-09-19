import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { MyBookings } from "@/app/(app)/bookings/MyBookings";
import { BOOKINGS, TENANCIES } from "../fixtures";

/** /bookings with the fixture stays in their tabs and the fixture tenancies
    in their own section above them: one charge still to pay, one settled. */
export default async function BookingsPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const groups = {
    upcoming: BOOKINGS.filter((b) => b.status === "CONFIRMED"),
    completed: BOOKINGS.filter((b) => b.status === "COMPLETED"),
    cancelled: [],
    /* `BookingGroups` grew a fourth half when a rent charge stopped being
       dropped from /bookings (lib/bookings/queries.ts). A tenancy is not a
       stay and is drawn by `TenancyCard`: a move-in day, a period word, the
       charge's frozen total and one door to `/rent/pay`. */
    rent: TENANCIES,
  };
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.bookings} fallback="/preview/f3" />
      <MyBookings groups={groups} locale={locale} />
    </div>
  );
}
