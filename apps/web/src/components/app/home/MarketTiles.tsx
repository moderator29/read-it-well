import Link from "next/link";
import { formatNumber, type Dictionary, type Locale } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { MARKETS, type MarketCounts } from "./markets";

/**
 * The market grid, to the founder's target render: nine tiles three to a row,
 * each a near-black navy container with a lit brand rim and a soft glow,
 * holding a small glass object at the top left, the market's name under it,
 * its real listing count under that, and the arrow at the foot.
 *
 * THE COUNT IS READ OR IT IS ABSENT. `market-queries.ts` counts published
 * rows per market; a market whose count did not come back draws its name
 * alone and the tile still works. Nothing here fills a gap with a number,
 * and nothing rounds one up with a "+".
 */
export function MarketTiles({
  t,
  locale,
  counts,
}: {
  t: Dictionary;
  locale: Locale;
  counts: MarketCounts;
}) {
  const copy = t.home.markets;

  return (
    <nav aria-label={copy.label} className="nf-rise nf-rise-4 mt-md">
      <ul className="nf-home__markets">
        {MARKETS.map((market) => {
          const count = counts[market.key];
          const name = copy[market.key];
          const countLine =
            count === undefined
              ? ""
              : (count === 1 ? copy.listingOne : copy.listingMany).replace(
                  "{count}",
                  formatNumber(count, locale),
                );

          return (
            <li key={market.key} className="min-w-0">
              <Link href={market.href} className="nf-glass nf-glass--tile nf-home__market nf-tap">
                <span className="nf-home__market-art">
                  <BrandIcon name={market.icon} fill />
                </span>
                <span className="nf-home__market-name">{name}</span>
                {countLine ? (
                  <span className="nf-home__market-count nf-numeric">{countLine}</span>
                ) : null}
                <UiIcon name="arrow-right" size={16} className="nf-home__market-go" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
