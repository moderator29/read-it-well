import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHead } from "@/components/site/SiteHead";
import { ButtonLink } from "@/components/ui/Button";
import { shareCardCopy } from "@/components/app/price/share-copy";
import { areaAsking } from "@/lib/price-check/queries";
import { shareLines } from "@/lib/price-check/share-card";
import { PRICE_CHECK_DISCLAIMER } from "@/lib/price-check/disclaimer";
import { structuredDataJson } from "@/lib/listings/syndication";
import { areaDatasetJsonLd, publicAskingRows, resolveAreaPage, rowAsShare } from "@/lib/areas/pages";
import { areaPricePages } from "@/lib/areas/queries";
import { siteUrl } from "@/lib/site";

/**
 * `/areas/[state]/[area]`: A PUBLIC AREA PRICE PAGE (V-82).
 *
 * The only public inventory surface under the 23 September ruling, and it
 * carries no inventory: what homes in one area are ASKING, by type and
 * bedrooms, the count behind every range and the dates, and one way in. No
 * listing, no photograph of a listing, no agent, no address. It is public
 * because `areas` is in `PUBLIC_SEGMENTS` beside the landing page and the
 * company pages, which is what it is: a statement about a market.
 *
 * A PAGE EXISTS ONLY WHERE THE FLOOR IS MET. `resolveAreaPage` answers null
 * for any area without at least the Price Check minimum of REAL listings, and
 * null is `notFound()`, never a thin page (see `lib/areas/pages.ts`). Today
 * every listing is an example, so every address under `/areas` is a 404 and
 * the sitemap lists none. That is correct, and it grows with supply.
 *
 * The figures are `area_asking_summary`'s, the same read the in-app area
 * report makes, worded by `shareLines`, the same words as a share card, and
 * followed by the Price Check disclaimer in full, because a figure that has
 * left the product carries it (rule 3 of `PRICE_CHECK_DISCLAIMER`).
 *
 * THE STRUCTURED DATA IS A DATASET, NEVER AN OFFER. An Offer would make an
 * asking figure eligible for a rich result as something purchasable.
 */

type Params = { params: Promise<{ state: string; area: string }> };

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

async function pageFor(stateSlug: string, areaSlug: string) {
  const pages = await areaPricePages();
  return pages === null ? null : resolveAreaPage(stateSlug, areaSlug, pages);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { state, area } = await params;
  const found = await pageFor(state, area);
  if (found === null) return { robots: { index: false, follow: false } };
  const t = getDictionary(await getLocale());
  const place = `${found.area}, ${found.stateName}`;
  const title = fill(t.frontDoor.areas.title, { place });
  const description = fill(t.frontDoor.areas.metaDescription, { place, count: found.listingCount });
  const url = `${siteUrl()}${found.path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { type: "website", title, description, url },
  };
}

export default async function AreaPricePage({ params }: Params) {
  const { state, area } = await params;
  const found = await pageFor(state, area);
  if (found === null) notFound();

  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.frontDoor.areas;
  const place = `${found.area}, ${found.stateName}`;
  const asked = await areaAsking(found.stateCode, null, found.area, "rent", null, null);
  const rows = asked === null ? null : publicAskingRows(asked);
  const cardCopy = shareCardCopy(t);
  const searchNext = `/search?q=${encodeURIComponent(found.area)}`;
  const signIn = `/sign-in?next=${encodeURIComponent(searchNext)}`;

  const jsonLd =
    rows && rows.length > 0
      ? structuredDataJson(
          areaDatasetJsonLd(found, rows, siteUrl(), `${copy.lead} ${PRICE_CHECK_DISCLAIMER.lead}`),
        )
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // The string is escaped by `structuredDataJson`: no `<` survives.
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <SiteHead
        plate="skyline-waterfront-dusk"
        icon="report-stats"
        chip={t.priceCheck.title}
        title={fill(copy.title, { place })}
        lede={copy.lead}
      />
      <div className="nf-shell pb-section">
        <div className="mx-auto max-w-3xl">
          <p
            className="mt-section nf-body text-[var(--nf-content-secondary)]"
            data-testid="area-holding"
          >
            {fill(copy.holding, { count: found.listingCount, area: found.area })}
          </p>

          {rows === null ? (
            <p className="mt-group nf-body text-[var(--nf-content-muted)]" data-testid="area-unreachable">
              {copy.unreachable}
            </p>
          ) : rows.length === 0 ? (
            <div className="mt-group nf-panel nf-panel--card p-card-sm" data-testid="area-too-few">
              <p className="nf-body font-semibold text-[var(--nf-content-primary)]">
                {fill(copy.tooFew, { area: found.area })}
              </p>
              <p className="mt-inline nf-body-sm text-[var(--nf-content-secondary)]">{copy.tooFewBody}</p>
            </div>
          ) : (
            <ul className="mt-group space-y-row" data-testid="area-ranges">
              {rows.map((row) => {
                const lines = shareLines(rowAsShare(found, row), cardCopy, locale, found.stateName);
                return (
                  <li
                    key={`${row.propertyType}-${row.bedrooms}`}
                    className="nf-panel nf-panel--card block p-card-sm"
                  >
                    <p className="nf-body font-semibold text-[var(--nf-content-primary)]">{lines.headline}</p>
                    <p className="mt-inline nf-numeric text-[length:var(--nf-text-h4)] font-semibold text-[var(--nf-content-primary)]">
                      {lines.range}
                    </p>
                    <p className="mt-inline nf-caption text-[var(--nf-content-muted)]">{lines.basis}</p>
                  </li>
                );
              })}
            </ul>
          )}

          {rows !== null && rows.length > 0 && (
            <p className="mt-inline nf-caption text-[var(--nf-content-muted)]">{copy.rangeNote}</p>
          )}

          <section className="mt-section nf-panel nf-panel--card p-card-sm" aria-label={PRICE_CHECK_DISCLAIMER.lead}>
            <p className="nf-body font-semibold text-[var(--nf-content-primary)]">{PRICE_CHECK_DISCLAIMER.lead}</p>
            {PRICE_CHECK_DISCLAIMER.body.map((line) => (
              <p key={line} className="mt-inline nf-body-sm text-[var(--nf-content-secondary)]">
                {line}
              </p>
            ))}
          </section>

          <div className="mt-section flex flex-col gap-row">
            <ButtonLink href={signIn} variant="primary" full data-testid="area-cta">
              {fill(copy.cta, { count: found.listingCount, area: found.area })}
            </ButtonLink>
            <p className="nf-caption text-[var(--nf-content-muted)]">{copy.ctaNote}</p>
          </div>
        </div>
      </div>
    </>
  );
}
