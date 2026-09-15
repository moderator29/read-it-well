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
  /** What the amount covers, already resolved for this category. */
  period: "night" | "year" | "guest";
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
  verified: string;
};
