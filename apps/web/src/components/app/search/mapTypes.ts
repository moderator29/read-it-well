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
  /** Verified by RentMe. */
  verified: boolean;
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
