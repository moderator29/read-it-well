import type { PricePeriod, ListingIntent } from "./pricing";
import type { ListingKind } from "./types";

/**
 * WHICH MARKET A LISTING IS IN: a tenancy, a sale, a stay by the night, a
 * table or an experience.
 *
 * UX-10 / UI-P2-03 / UX-04. Routing and templates keyed on `kind` alone, so a
 * villa or an apartment let BY THE YEAR opened under the nightly Stays
 * template ("₦50m Total for 2 nights" on a ₦25m yearly rent), and premises
 * listed under the restaurant kind opened as a place to book a table. The
 * kind says what the building is; the price period says how it is let. The
 * period decides, and the kind is only the fallback for a row with no stated
 * price.
 *
 *   sale        intent is sale, whatever the kind.
 *   tenancy     a rent stated by the month, quarter or year.
 *   stay        a rate by the night.
 *   dining      a rate per head on a restaurant (or any non-experience kind).
 *   experience  a rate per head on an experience.
 *
 * Client-safe and pure.
 */
export type ListingMarket = "tenancy" | "sale" | "stay" | "dining" | "experience";

export type MarketFacts = {
  kind: ListingKind;
  intent?: ListingIntent | undefined;
  pricePeriod?: PricePeriod | undefined;
  priceMinor?: number | undefined;
};

/** Kinds that are, by default, slept in by the night. */
const NIGHTLY_KINDS = new Set<ListingKind>(["hotel", "shortlet", "villa", "apartment"]);

const RENT_PERIODS = new Set<PricePeriod>(["month", "quarter", "year"]);

function marketOfKind(kind: ListingKind): ListingMarket {
  if (kind === "restaurant") return "dining";
  if (kind === "experience") return "experience";
  if (NIGHTLY_KINDS.has(kind)) return "stay";
  return "tenancy";
}

export function marketOf(facts: MarketFacts): ListingMarket {
  if (facts.intent === "sale") return "sale";
  const period = facts.pricePeriod;
  const stated = (facts.priceMinor ?? 0) > 0;
  if (period && RENT_PERIODS.has(period)) {
    /* A rent with no figure is the headline's "nothing stated" default (a
       year), not a statement; a nightly kind with no price keeps its kind. */
    return stated || !NIGHTLY_KINDS.has(facts.kind) ? "tenancy" : marketOfKind(facts.kind);
  }
  if (period === "night" && stated) return facts.kind === "restaurant" ? "dining" : "stay";
  if (period === "guest" && stated) return facts.kind === "experience" ? "experience" : "dining";
  return marketOfKind(facts.kind);
}

/** The Property side's markets: let on a tenancy, or sold. */
export function isPropertyMarket(market: ListingMarket): boolean {
  return market === "tenancy" || market === "sale";
}
