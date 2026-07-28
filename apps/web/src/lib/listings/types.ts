/** Domain types for discovery results. Shared by every data source. */

export type ListingKind = "hotel" | "apartment" | "home" | "shortlet" | "villa";

export type Listing = {
  id: string;
  slug: string;
  title: string;
  kind: ListingKind;
  /** Display locality, e.g. "Lekki Phase 1". */
  area: string;
  /** Settlement, e.g. "Lagos". */
  city: string;
  state: string;
  /**
   * Nightly rate in MINOR UNITS (kobo). Never a float, never naira.
   * 25_000_000 kobo is 250,000 naira.
   */
  priceMinor: number;
  currency: "NGN";
  bedrooms: number;
  bathrooms: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  instantBook: boolean;
  amenities: string[];
  /** Deterministic hue index for the placeholder tile, 0 to 5. */
  hue: number;
};

export interface ListingRepository {
  /** True when results come from local sample content rather than the platform. */
  readonly isSeed: boolean;
  recommended(limit?: number): Promise<Listing[]>;
}
