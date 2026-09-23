import "@/app/css/price-check.css";

import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { PriceCheckScreen } from "@/components/app/price/PriceCheckScreen";
import { SweepFrame } from "../Frame";

/** `/price` as a reader first meets it: Lagos chosen, no pin dropped yet. */
export const dynamic = "force-dynamic";

export default async function SweepPrice() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <SweepFrame route="/price">
      <PageHeader title={t.priceCheck.title} subtitle={t.priceCheck.lead} fallback="/home" />
      <p className="nf-body text-[var(--nf-content-secondary)]">{t.priceCheck.intro}</p>
      <div className="mt-section-tight">
        <PriceCheckScreen
          locale={locale}
          t={t}
          states={[
            { code: "LA", name: "Lagos" },
            { code: "FC", name: "Federal Capital Territory" },
          ]}
          lgas={[
            { code: "la_eti_osa", name: "Eti-Osa" },
            { code: "la_ikeja", name: "Ikeja" },
          ]}
          query={{
            stateCode: "LA",
            lgaCode: "la_eti_osa",
            area: "Lekki Phase 1",
            lat: null,
            lng: null,
            propertyType: "apartment",
            intent: "rent",
            rentPeriod: "year",
            bedrooms: 3,
            sizeSqm: null,
          }}
          result={null}
          comparables={[]}
          areaRows={null}
          areaCensus={null}
          facts={null}
          signedIn
          checkId="00000000-0000-4000-8000-000000000000"
        />
      </div>
    </SweepFrame>
  );
}
