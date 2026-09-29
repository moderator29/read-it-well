import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { TripSpine } from "@/components/app/plans/TripSpine";
import { TenancyCard } from "@/components/app/bookings/TenancyCard";
import { BOOKINGS, TENANCIES } from "../fixtures";

/** /bookings with the fixture stays in their tabs and the fixture tenancies
    in their own section above them: one charge still to pay, one settled. */
export default async function BookingsPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  /* Plans (V-76) draws tenancies with `TenancyCard` and stays on the date
     spine; the tabbed `MyBookings` record is gone. */
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader variant="large" title={t.shape.plans.title} fallback="/preview/f3" />
      <div className="flex flex-col gap-md">
        {TENANCIES.map((tenancy) => (
          <TenancyCard key={tenancy.id} tenancy={tenancy} locale={locale} />
        ))}
      </div>
      <TripSpine bookings={BOOKINGS} today="2026-09-24" locale={locale} />
    </div>
  );
}
