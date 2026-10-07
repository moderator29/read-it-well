import type { Dictionary } from "@vallo/i18n/core";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import { photo, type PhotoName } from "@/lib/site/photos";
import type { Door } from "./doors";
import { MarketStack, type MarketCard } from "./MarketStack";

/**
 * THE FOUR MARKETS, AS A ROLLING CARD STACK (P7, 7 October 2026; the
 * founder's `references/2026-10-07/rolling-card-stack.jpg`).
 *
 * Folder-tab cards, each with an outline glyph, the market's name and a mono
 * index; the front one is open on a title, one line and a photograph that
 * fades at its edge. The stack rolls as the reader scrolls through it, or on
 * a tap of any tab (`MarketStack.tsx` says how, and what reduced motion
 * gets).
 *
 * Every door goes where the market really lives, through the landing's
 * honest door (`doors.ts`): homes to the property search, stays to the Stays
 * side, restaurants to the restaurant list, and workspaces to the office
 * search, which is the commercial stock the catalogue holds (a shop or an
 * office is let on a yearly tenancy like a home, `lib/listings/types.ts`).
 * The photographs are pictures of kinds of place, not listings.
 */
const MARKETS: readonly { key: "homes" | "stays" | "dining" | "work"; icon: UiIconName; href: string; photo: PhotoName }[] = [
  { key: "homes", icon: "home", href: "/search", photo: "villa-exterior-sunset" },
  { key: "stays", icon: "building-hotel", href: "/stays", photo: "resort-pool-deck" },
  { key: "dining", icon: "utensils", href: "/restaurants", photo: "restaurant-01" },
  { key: "work", icon: "briefcase", href: "/search?type=office", photo: "tower-entrance-dusk" },
];

export function Markets({ t, door }: { t: Dictionary; door: Door }) {
  const m = t.experienceLanding.plasma.markets;
  const cards: MarketCard[] = MARKETS.map((market) => ({
    key: market.key,
    icon: market.icon,
    href: door(market.href),
    photo: photo(market.photo),
    ...m.items[market.key],
  }));
  return (
    <section className="nf-pl-markets" data-chapter="markets" aria-labelledby="nf-pl-markets-title">
      <MarketStack cards={cards} label={m.label}>
        <header className="nf-pl-head nf-pl-markets__head">
          <p className="nf-pl-overline">{m.overline}</p>
          <h2 id="nf-pl-markets-title" className="nf-pl-title">
            {m.title}
          </h2>
          <p className="nf-pl-lede">{m.lede}</p>
        </header>
      </MarketStack>
    </section>
  );
}
