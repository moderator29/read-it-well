import Link from "next/link";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getListingRepository } from "@/lib/listings/repository";
import type { ListingKind } from "@/lib/listings/types";
import { Reveal } from "@/components/site/Reveal";
import { Words } from "@/components/site/Words";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { gatedHref } from "@/lib/site/gated-href";

/**
 * The markets. Every kind of place a person can find here, on the front door.
 *
 * THIS SECTION EXISTS BECAUSE THE LANDING PAGE HAD NARROWED TO ONE MARKET.
 *
 * The rebuild before this one cut the category grid as repetition and built
 * the page around the move-in total, which is a yearly tenancy's concern. The
 * result described renting a flat. Vallo is a marketplace: nine live markets
 * from a night in a hotel to a plot of land, and the thing a stranger has to
 * understand in four seconds is the BREADTH, because breadth is what a
 * marketplace is. One differentiator, however good, is not a product.
 *
 * So the markets are stated as themselves, early, with their own objects, and
 * every tile is a real search rather than a decoration.
 *
 * THE COUNTS ARE REAL OR ABSENT. Each tile carries the number of published
 * places in that market, counted from the same catalogue read the rail below
 * uses. A market with nothing in it says so plainly rather than printing a
 * zero dressed as a figure, and if the catalogue cannot be reached the tiles
 * carry no numbers at all. This page has already had one section deleted for
 * publishing a hardcoded count under a heading that promised real ones.
 *
 * The order is how somebody arrives: somewhere to sleep tonight, then
 * somewhere to live, then somewhere to trade, then the ground itself. It is
 * the same order `CategoryRail` uses on Explore, and the two are meant to
 * agree: a person who meets the markets here should find them unchanged when
 * they get inside.
 */

type Market = { kind: ListingKind; label: string; icon: BrandIconName };

export async function MarketsBand({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  const markets: Market[] = [
    { kind: "shortlet", label: t.landing.markets.shortlet, icon: "shortlet" },
    { kind: "hotel", label: t.landing.markets.hotel, icon: "hotel" },
    { kind: "apartment", label: t.landing.markets.apartment, icon: "serviced-apartment" },
    { kind: "rental", label: t.landing.markets.rental, icon: "terrace-house" },
    { kind: "home", label: t.landing.markets.home, icon: "modern-house" },
    { kind: "villa", label: t.landing.markets.villa, icon: "villa" },
    { kind: "shop", label: t.landing.markets.shop, icon: "shop-retail" },
    { kind: "office", label: t.landing.markets.office, icon: "office-space" },
    { kind: "land", label: t.landing.markets.land, icon: "land-plot" },
  ];

  /*
   * One read of the catalogue, counted by kind. `search` answers an empty
   * array on any failure rather than throwing, so a database this page cannot
   * reach costs the tiles their numbers and nothing else.
   */
  const catalogue = await getListingRepository().search();
  const counts = new Map<ListingKind, number>();
  for (const listing of catalogue) {
    counts.set(listing.kind, (counts.get(listing.kind) ?? 0) + 1);
  }
  const knowCounts = catalogue.length > 0;

  return (
    <section className="nf-shell py-section" aria-labelledby="nf-markets-title">
      <Reveal className="mb-block max-w-[52ch]">
        <span className="nf-overline">{t.landing.markets.overline}</span>
        <h2 id="nf-markets-title" className="nf-h1 mt-row">
          <Words text={t.landing.markets.title} accentFrom={3} />
        </h2>
        <p className="nf-lede mt-group">{t.landing.markets.body}</p>
      </Reveal>

      <ul className="grid grid-cols-2 gap-group sm:grid-cols-3 lg:grid-cols-5">
        {markets.map((market, i) => {
          const count = counts.get(market.kind) ?? 0;
          return (
            <Reveal as="li" key={market.kind} delay={i * 40}>
              <Link
                href={gatedHref(`/search?kind=${market.kind}`)}
                className="nf-card nf-card--interactive flex h-full flex-col items-center gap-row p-card text-center"
              >
                <span className="h-14 w-14 shrink-0 lg:h-16 lg:w-16">
                  <BrandIcon name={market.icon} fill />
                </span>
                <span className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                  {market.label}
                </span>
                {knowCounts ? (
                  <span className="nf-caption nf-numeric text-[var(--nf-content-muted)]">
                    {count > 0
                      ? t.landing.markets.count.replace("{count}", String(count))
                      : t.landing.markets.none}
                  </span>
                ) : null}
              </Link>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
