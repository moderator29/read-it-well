import Link from "next/link";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { StayCard } from "@/components/app/stays/StayCard";
import { StaySearchBar } from "@/components/app/stays/StaySearchBar";
import { StayCategoryTiles } from "@/components/app/stays/StayCategoryTiles";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import { STAYS } from "../fixtures";

/** Stays home with the fixture shelf: the same hero, bar, tiles and cards. */
export default async function StaysPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.catalogue.stays;
  return (
    <>
      <section className="nf-rise nf-stays-hero">
        <div className="min-w-0">
          <h1 className="nf-h1">{copy.title}</h1>
          <p className="nf-body mt-inline-tight max-w-measure-lede text-[var(--nf-content-secondary)]">{copy.lede}</p>
        </div>
        <span className="nf-stays-hero__object" aria-hidden="true">
          <BrandIcon name="hotel" fill priority />
        </span>
      </section>
      <div className="mt-md">
        <StaySearchBar t={t} filtersHref="/preview/f3/stays" />
      </div>
      <section className="mt-md">
        <StayCategoryTiles t={t} active="hotel" />
      </section>
      <section className="mt-section-tight">
        <div className="mb-heading flex items-end justify-between gap-md">
          <h2 className="nf-h3">{copy.featured}</h2>
          <Link href="/preview/f3/stays" className="nf-link-quiet nf-tap nf-body-sm shrink-0 text-[var(--nf-content-link)]">
            {copy.seeAll}
            <UiIcon name="arrow-right" size={ICON.inline} />
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {STAYS.map((stay, index) => (
            <li key={stay.id}>
              <StayCard stay={stay} locale={locale} t={t} index={index} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
