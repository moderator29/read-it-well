import { formatMoney } from "@vallo/i18n/core";
import type { Listing } from "@/lib/listings/types";

/**
 * Price wording shared by search_listings and compare_listings, moved here
 * unchanged from `app/api/assistant/route.ts` (AI-01).
 */

export function pricePeriod(l: Listing): string {
  if (l.kind === "restaurant" || l.kind === "experience") return "guest";
  return l.pricePeriod === "year" ? "year" : "night";
}

/**
 * What the model is allowed to say about a price, including when there is none.
 *
 * This used to be `formatMoney(l.priceMinor)` unconditionally, which states a
 * number whatever the row holds. Zero beside a currency symbol reads as free,
 * and the assistant is the surface where a wrong number is spoken as a
 * sentence rather than shown in a slot somebody can see is empty.
 *
 * "Not published" is the honest phrase. The place has a price, we were not
 * told it, and neither of those is the same as free.
 */
export function priceLine(l: Listing): string {
  if (l.priceMinor <= 0) return "price not published on Vallo";
  return `${formatMoney(l.priceMinor)} per ${pricePeriod(l)}`;
}
