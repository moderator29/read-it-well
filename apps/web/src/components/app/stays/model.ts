import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import type { Listing, ListingKind } from "@/lib/listings/types";

/**
 * The Stays side's first-light model, over the EXISTING catalogue.
 *
 * The catalogue was already two-sided: `ListingKind` carries hotel, shortlet,
 * apartment (nightly lodging), villa and restaurant, and `lib/reservations`
 * and `lib/bookings` are live. This module is what the Stays shell reads on
 * day one so the flip lands somewhere real immediately; the business-grade
 * schema (accommodations, room types, rate plans, inventory) lands beside it
 * and the shelf grows onto it without this file changing shape.
 *
 * Pure functions only, so they are tested without a browser.
 */

/** The kinds that live on the Stays side. Everything else is Property. */
export const STAY_KINDS: readonly ListingKind[] = ["hotel", "shortlet", "apartment", "villa"];
export const TABLE_KINDS: readonly ListingKind[] = ["restaurant"];
export const STAYS_SIDE_KINDS: readonly ListingKind[] = [...STAY_KINDS, ...TABLE_KINDS];

export function isStayKind(kind: ListingKind): boolean {
  return STAYS_SIDE_KINDS.includes(kind);
}

/**
 * The six doors on the Stays home. Each is a preset into `/stays/search`.
 *
 * Resorts and guest houses have no glass mark of their own yet (BRAND_MARKS
 * section 5 files the commission); `beach-house` and `villa` stand in, as the
 * frontend research names them. Restaurants likewise ride `concierge-bell`
 * until the object is drawn. Interim marks are recorded, not hidden.
 */
export type StayCategory = {
  key: "hotels" | "shortlets" | "serviced" | "resorts" | "guestHouses" | "restaurants";
  icon: BrandIconName;
  href: string;
};

export const STAY_CATEGORIES: readonly StayCategory[] = [
  { key: "hotels", icon: "hotel", href: "/stays/search?type=hotel" },
  { key: "shortlets", icon: "shortlet", href: "/stays/search?type=shortlet" },
  { key: "serviced", icon: "serviced-apartment", href: "/stays/search?type=apartment" },
  { key: "resorts", icon: "beach-house", href: "/stays/search?type=villa" },
  { key: "guestHouses", icon: "bungalow", href: "/stays/search?type=villa&q=guest" },
  { key: "restaurants", icon: "concierge-bell", href: "/restaurants" },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A typed date or nothing. Never a guess. */
export function parseIsoDate(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return undefined;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time)) return undefined;
  return new Date(time).toISOString().slice(0, 10) === value ? value : undefined;
}

/**
 * Nights between two ISO dates, or null when the pair is not a real stay
 * (missing, reversed, same day, or absurdly long).
 */
export function nightsBetween(checkIn?: string, checkOut?: string): number | null {
  if (!checkIn || !checkOut) return null;
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  const nights = Math.round((b - a) / 86_400_000);
  if (nights < 1 || nights > 90) return null;
  return nights;
}

/** Guests: one to sixteen, defaulting to two. Anything else is two. */
export function parseGuests(value: string | string[] | undefined): number {
  if (typeof value !== "string") return 2;
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 16 ? n : 2;
}

/**
 * The total is the headline.
 *
 * Nightly rate times nights, plus the once-per-stay charges the listing
 * declares, all in kobo. The same arithmetic `reserve()` does after, so the
 * number on the shelf is the number at checkout. A listing with no real
 * nightly price has no total and says so (null) rather than showing zero.
 */
export function stayTotalMinor(listing: Listing, nights: number): number | null {
  if (listing.pricePeriod !== "night" || listing.priceMinor <= 0) return null;
  return (
    listing.priceMinor * nights + (listing.cleaningMinor ?? 0) + (listing.serviceMinor ?? 0)
  );
}

export type StayDates = { checkIn?: string; checkOut?: string; nights: number | null; guests: number };

export function readStayDates(params: Record<string, string | string[] | undefined>): StayDates {
  const checkIn = parseIsoDate(params.checkIn);
  const checkOut = parseIsoDate(params.checkOut);
  const nights = nightsBetween(checkIn, checkOut);
  return {
    checkIn: nights ? checkIn : undefined,
    checkOut: nights ? checkOut : undefined,
    nights,
    guests: parseGuests(params.guests),
  };
}

/** Rebuild the stays search href with the dates and guests carried along. */
export function toStaysSearchHref(
  input: { q?: string; type?: ListingKind; checkIn?: string; checkOut?: string; guests?: number; sort?: string },
): string {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.type) params.set("type", input.type);
  if (input.checkIn && input.checkOut) {
    params.set("checkIn", input.checkIn);
    params.set("checkOut", input.checkOut);
  }
  if (input.guests && input.guests !== 2) params.set("guests", String(input.guests));
  if (input.sort && input.sort !== "recommended") params.set("sort", input.sort);
  const query = params.toString();
  return query ? `/stays/search?${query}` : "/stays/search";
}
