import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { StayCard } from "@/components/app/stays/StayCard";
import { RESTAURANTS } from "../fixtures";

/** /restaurants with the three plates and the hours labels a venue with service windows gets. */
export default async function RestaurantsPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.stays.restaurantsTitle} subtitle={t.stays.restaurantsLine} fallback="/preview/f3" />
      <ul className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        {RESTAURANTS.map((card, index) => (
          <li key={card.id}>
            <StayCard stay={card} locale={locale} t={t} index={index} />
          </li>
        ))}
      </ul>
    </div>
  );
}
