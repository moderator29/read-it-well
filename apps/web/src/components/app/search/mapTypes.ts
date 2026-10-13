import type { ListingKind } from "@/lib/listings/types";

/**
 * The shape the map speaks.
 *
 * A deliberately small projection of `Listing`: everything a pin or a docked
 * card needs and nothing else, because this crosses the server to client
 * boundary on every map render and a whole catalogue of full listings would be
 * paid for in bytes on a phone.
 */
export type MapListing = {
  id: string;
  title: string;
  /** Display locality, e.g. "Lekki Phase 1". */
  area: string;
  city: string;
  /** Category noun for a listing that carries no amount, e.g. "Restaurant". */
  kindLabel: string;
  /** The market itself, so the dock thumbnail draws this kind of place when
      the listing has no photograph. `kindLabel` cannot serve: it is a
      translated display string, and matching on it would break the drawing the
      first time somebody read the map in another language. */
  kind: ListingKind;
  /** Rate in MINOR UNITS (kobo). Zero means the source published no amount. */
  priceMinor: number;
  currency: string;
  /**
   * What the amount covers, already resolved for this category. A monthly or
   * quarterly rent says so, and a sale says nothing after its figure: the
   * map used to call every non-yearly price "a night".
   */
  period: "night" | "year" | "guest" | "month" | "quarter" | "sale";
  /** Bedrooms and bathrooms as listed; zero is drawn as nothing, never as "0 beds". */
  bedrooms?: number;
  bathrooms?: number;
  /** Floor area in square metres, when the lister gave one. */
  sizeSqm?: number;
  rating: number;
  reviewCount: number;
  photo?: string;
  /** Deterministic hue index for the gradient tile, 0 to 5. */
  hue: number;
  /** Verified by Vallo. */
  verified: boolean;
  /**
   * An example listing: no such property is available.
   *
   * On the projection rather than resolved on the client, because the docked
   * card is a CARD and has to be able to disclose the same thing a grid card
   * does. It was the one surface where a reader could meet an invented property
   * with a real area and a real price and be told nothing at all, since the map
   * does not go through `ListingCard`. One boolean is the cheapest field on
   * this type and it is the only one that changes what the card MEANS.
   */
  isDemo: boolean;
  /** A modest example: draw its kind, never a scene photograph (`example-imagery.ts`). */
  drawn?: boolean;
  lat: number;
  lng: number;
  /**
   * True when the pin sits on the listing's own locality, false when we only
   * knew its city. The surface note is written from this.
   */
  byArea: boolean;
};

/** The handful of translated words the map needs, lifted from the dictionary. */
export type MapCopy = {
  night: string;
  year: string;
  guest: string;
  /** "/month" and "/quarter" after a rent; optional so an older caller still compiles. */
  month?: string;
  quarter?: string;
  /** "m²" after a floor area. */
  sqm?: string;
  verified: string;
  /** The round credit control's name, and the heading of what it opens. */
  about?: string;
  credits?: string;
  /** "{count} places have no pin yet" (Session 3, W2: the listing with no pin). */
  noPinOne?: string;
  noPinMany?: string;
  /** Opens the same results as a list, where an unplaced place is still drawn. */
  noPinList?: string;
  /** The empty viewport's words. */
  emptyTitle?: string;
  emptyArea?: string;
  emptySearch?: string;
  emptyAction?: string;
  /** The line under the map: tiles that failed, the credits' joiner, approximate pins. */
  imageryOffline: string;
  creditJoin: string;
  approximate: string;
};
