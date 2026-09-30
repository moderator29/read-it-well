import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/i18n/public-metadata";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { siteUrl } from "@/lib/site";
import { SiteHead } from "@/components/site/SiteHead";
import { MoveInCalculator } from "@/components/site/MoveInCalculator";
import { JsonLd } from "@/components/site/JsonLd";
import { breadcrumbLd, webPageLd } from "@/lib/site/structured-data";
import { inputFromQuery } from "@/lib/site/move-in-calculator";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * A8. `/move-in-cost`: the move-in total, for anyone, with no account.
 *
 * The promise on the landing is "the real cost up front", and until now the
 * only place that cost was visible was inside a gated listing. This page lets
 * a stranger type a rent and the fees they were quoted and see the whole
 * amount, worked out by the listing's own maths (`lib/site/move-in-calculator.ts`).
 * No fee is printed as typical: the one published rule the codebase holds is
 * offered on a tap, labelled as a maximum, with its source.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  const c = t.publicDoors.moveIn;
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    /* A10: canonical in the page's language, and the hreflang set. */
    alternates: (await localizedAlternates("/move-in-cost")) ?? { canonical: "/move-in-cost" },
    openGraph: { url: "/move-in-cost", title: c.metaTitle, description: c.metaDescription },
  };
}

export default async function MoveInCostPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const c = t.publicDoors.moveIn;
  const query = await searchParams;
  const state = typeof query.state === "string" ? query.state.slice(0, 2).toUpperCase() : "LA";

  return (
    <>
      <JsonLd
        data={[
          webPageLd({ path: "/move-in-cost", name: c.metaTitle, description: c.metaDescription }),
          breadcrumbLd([{ name: "Vallo", path: "/" }, { name: c.metaTitle, path: "/move-in-cost" }]),
        ]}
      />
      <SiteHead plate="living-room-day" icon="coin-naira" chip={c.chip} title={c.title} lede={c.lede} tool />
      <div className="nf-shell pb-section">
        <div className="mx-auto max-w-5xl pt-block">
          <MoveInCalculator copy={c} locale={locale} initial={inputFromQuery(query)} initialState={state} origin={siteUrl()} />
          <p className="mt-group text-center">
            <Link href="/guides/what-a-move-in-total-includes" className="nf-pd-link">
              <UiIcon name="file-text" size={16} aria-hidden />
              {c.guideLink}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
