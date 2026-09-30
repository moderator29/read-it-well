/**
 * THE CARD AT A GLANCE (recommendations B2 and B4, 30 September 2026).
 *
 * The few facts a listing card already prints, as plain strings: the title,
 * the place, the lead photograph, the lead price line and the one mark on the
 * photo (Verified or Example). Two surfaces carry them without re-reading the
 * listing:
 *
 *  - B2, "Looked at recently" on Home: `RecordVisit` stores this on the phone
 *    when a listing is opened, and Home reads it back.
 *  - B4, the listing opens in one frame: the card hands this to the listing's
 *    loading shell at tap time, so the photo, title and price paint at once.
 *
 * NOTHING NEW IS SAID. Every string is one the card already printed, built by
 * the card's own model (`cardPrice`) and formatted by the glance money rule.
 * A listing with no price prints no price line, never a zero.
 *
 * Pure: no React, no storage. The validator is here too because storage is
 * user-writable and this shape comes back from it.
 */
import { formatMoneyGlance, type Dictionary, type Locale } from "@vallo/i18n/core";
import { cardPrice } from "@/components/app/listing-card-model";
import type { Listing } from "./types";

export type CardGlanceMark = "verified" | "example" | null;

export type CardGlance = {
  id: string;
  title: string;
  /** "Lekki, Lagos": a place stated twice collapses, as on the card. */
  place: string;
  /** The lead photograph's URL, or null when the listing has none. */
  photo: string | null;
  /** "₦3.3m", or null when the lister asked for offers. */
  price: string | null;
  /** What the price is: "to move in", "/year", or "" for a sale. */
  priceNote: string;
  mark: CardGlanceMark;
};

type CardCopy = Pick<
  Dictionary["catalogue"]["card"],
  "moveIn" | "perYear" | "perMonth" | "perQuarter" | "night" | "head"
>;

const PERIOD_COPY: Record<string, keyof CardCopy> = {
  year: "perYear",
  month: "perMonth",
  quarter: "perQuarter",
  night: "night",
  guest: "head",
};

export function placeOf(listing: Pick<Listing, "area" | "city">): string {
  return listing.area && listing.area !== listing.city ? `${listing.area}, ${listing.city}` : listing.area || listing.city;
}

export function cardGlance(listing: Listing, locale: Locale, copy: CardCopy): CardGlance {
  const price = cardPrice(listing);
  let text: string | null = null;
  let note = "";
  if (price.lead === "moveIn") {
    text = formatMoneyGlance(price.minor, locale, listing.currency);
    note = copy.moveIn;
  } else if (price.lead === "headline") {
    text = formatMoneyGlance(price.minor, locale, listing.currency);
    const key = listing.intent === "sale" || !listing.pricePeriod ? undefined : PERIOD_COPY[listing.pricePeriod];
    note = key ? copy[key] : "";
  }
  return {
    id: listing.id,
    title: listing.title,
    place: placeOf(listing),
    photo: listing.photos[0] ?? null,
    price: text,
    priceNote: note,
    mark: listing.isDemo ? "example" : listing.verified ? "verified" : null,
  };
}

/** A photo URL that may go back into an image: https, or a same-origin path. */
export function isSafePhoto(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 2048 &&
    (value.startsWith("https://") || (value.startsWith("/") && !value.startsWith("//")))
  );
}
