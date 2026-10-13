import { countOf, formatNumber, type Locale } from "@vallo/i18n/core";
import { Money } from "@/components/ui/Money";
import type { SpokenPeriod } from "@/lib/money/spoken";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { isSafePhoto, placeOf } from "@/lib/listings/card-glance";

/**
 * THE PROPERTY BEING VISITED, ONE CARD. The real lead photograph, the title,
 * the area and city, the rent with its period (or a sale price with none),
 * and beds, baths and size where the listing states them. Nothing absent is
 * drawn: a listing with no size shows no size rather than a zero.
 */
export type VisitProperty = {
  title: string;
  area: string;
  city: string;
  photo: string | null;
  priceMinor: number;
  currency: "NGN";
  /** "/year", "/month", "/quarter", or "" for a sale. */
  period: string;
  /** The same period for the spoken figure; null for a sale. */
  spokenPeriod: SpokenPeriod | null;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number | null;
};

export function VisitPropertyCard({
  property,
  locale,
  label,
  sizeWord,
}: {
  property: VisitProperty;
  locale: Locale;
  /** The card's accessible name. */
  label: string;
  /** `visit.property.size`, "{size} m²". */
  sizeWord: string;
}) {
  const photo = property.photo && isSafePhoto(property.photo) ? property.photo : null;
  const place = placeOf(property);
  return (
    <section className="nf-panel nf-panel--card nf-visit-prop" aria-label={label} data-testid="visit-property">
      <div className="nf-visit-prop__photo">
        {photo ? (
          <RemoteImage src={photo} alt="" width={352} height={264} sizes="(min-width: 1024px) 21rem, 5.5rem" />
        ) : null}
      </div>
      <div className="nf-visit-prop__body">
        <div className="nf-visit-prop__top">
          <h2 className="nf-visit-prop__title">{property.title}</h2>
          {property.priceMinor > 0 ? (
            <p className="nf-visit-prop__price nf-numeric">
              {/* `<Money>` carries the spoken form ("naira four point five
                  million a year") beside the compact figure (B15). */}
              <Money minor={property.priceMinor} locale={locale} currency={property.currency} mode="glance" period={property.spokenPeriod} />
              {property.period ? (
                <span className="nf-visit-prop__period" aria-hidden="true">
                  {property.period}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        {place ? (
          <p className="nf-visit-prop__place">
            <span className="nf-visit-prop__fact">
              <UiIcon name="location" size={16} />
              {place}
            </span>
          </p>
        ) : null}
        <ul className="nf-visit-prop__facts">
          {property.bedrooms > 0 ? (
            <li className="nf-visit-prop__fact">
              <UiIcon name="bed" size={16} />
              {countOf(property.bedrooms, "beds", locale)}
            </li>
          ) : null}
          {property.bathrooms > 0 ? (
            <li className="nf-visit-prop__fact">
              <UiIcon name="bath" size={16} />
              {countOf(property.bathrooms, "baths", locale)}
            </li>
          ) : null}
          {property.sizeSqm && property.sizeSqm > 0 ? (
            <li className="nf-visit-prop__fact">
              <UiIcon name="grid" size={16} />
              {sizeWord.replace("{size}", formatNumber(Math.round(property.sizeSqm), locale))}
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
