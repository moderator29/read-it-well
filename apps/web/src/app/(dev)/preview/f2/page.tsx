import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LandingBody } from "@/components/site/landing/LandingBody";
import { PREVIEW_CARDS, PREVIEW_COUNTS, PREVIEW_STATS } from "./fixtures";

/**
 * The landing on fixtures, for screenshots in a sandbox that cannot reach
 * the catalogue. Same tree as `app/(landing)/page.tsx`; only the data differs.
 */
export default async function PreviewF2() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="nf-landing">
      <SiteHeader t={t} locale={locale} variant="landing" />
      <LandingBody
        t={t}
        locale={locale}
        data={{ cards: PREVIEW_CARDS, stats: PREVIEW_STATS, counts: PREVIEW_COUNTS }}
      />
      <SiteFooter t={t} />
    </div>
  );
}
