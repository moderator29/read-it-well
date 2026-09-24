import type { BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * The nine markets on home, to the founder's target render
 * (`docs/design/references/founder/GOVERNING-home-markets-target.png`): three
 * to a row, each an object, a name, its real count and an arrow.
 *
 * EVERY TILE LEADS SOMEWHERE REAL, which is why three of the render's names
 * are not here. The render offers Resorts, Guest Houses and Commercial, and
 * the search vocabulary has no filter for any of the three: `ListingKind` is
 * hotel, apartment, home, shortlet, villa, restaurant, experience, rental,
 * shop, office and land, and `parseKind` accepts one of those or nothing. A
 * tile that leads to a filter which does not exist is the same defect as the
 * render's "New Build", which this screen already answers with Land. So the
 * three become the nearest markets this catalogue actually holds, in the same
 * grid positions and with the same objects: Resorts becomes Villas, Guest
 * Houses becomes Apartments, Commercial becomes Offices.
 *
 * Shops (`type=shop`) is the one market with no tile. Nine is the render's
 * grid and the tenth would break it, so it is reached from search like any
 * other category, and it is recorded in the ledger rather than dropped
 * quietly.
 *
 * The counts come from the catalogue on every render. A market whose count
 * cannot be read shows its name alone: an invented number on the first screen
 * of the product is the one thing this tile may never do.
 */
export type MarketKey =
  | "rent"
  | "buy"
  | "shortlet"
  | "hotel"
  | "villa"
  | "apartment"
  | "restaurant"
  | "office"
  | "land";

export type Market = {
  key: MarketKey;
  /** The glass object at the tile's top left. */
  icon: BrandIconName;
  /** A real search, in the vocabulary `parseKind` and `parseShelfQuery` accept. */
  href: string;
};

export const MARKETS: Market[] = [
  /* `market`, NOT `intent`. `parseShelfQuery` reads `market=buy|rent` and
     reads nothing called `intent`, so these two tiles spent a parameter that
     was never parsed and landed on the unfiltered catalogue: somebody tapping
     Buy saw rentals mixed into the results. The other seven tiles spell
     `type`, which IS parsed, which is why only these two were wrong. */
  { key: "rent", icon: "keys-home", href: "/search?market=rent" },
  { key: "buy", icon: "home-check", href: "/search?market=buy" },
  { key: "shortlet", icon: "shortlet", href: "/stays/search?type=shortlet" },
  { key: "hotel", icon: "hotel", href: "/stays/search?type=hotel" },
  { key: "villa", icon: "villa", href: "/search?type=villa" },
  { key: "apartment", icon: "serviced-apartment", href: "/search?type=apartment" },
  { key: "restaurant", icon: "concierge-bell", href: "/search?type=restaurant" },
  { key: "office", icon: "office-space", href: "/search?type=office" },
  { key: "land", icon: "land-plot", href: "/search?type=land" },
];

/** How many published listings each market holds. A missing key shows no count. */
export type MarketCounts = Partial<Record<MarketKey, number>>;

/** A city on the featured row: its own name, its own count, its own plate. */
export type HomeCity = {
  name: string;
  href: string;
  /** Published listings in this city. Absent when the count could not be read. */
  count?: number;
  /** The plate, sized and compressed through next/image. */
  src: string;
  position: string;
};

/**
 * The listing behind the investment band's photograph.
 *
 * The band carries a Verified pill in the render, and a trust mark has to be
 * about something: this is a real for-sale row, its own photograph and its own
 * verified state, so the pill means what it means everywhere else on the
 * platform. Absent when the catalogue holds nothing for sale, and then the
 * band does not render at all rather than illustrate an empty market.
 */
export type InvestFeature = {
  href: string;
  title: string;
  photo: string;
  verified: boolean;
};
