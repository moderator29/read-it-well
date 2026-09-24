import type { ListingIntent } from "./pricing";

/**
 * THE PRICE CONTROL'S RANGE, PER MARKET (V-67 review).
 *
 * The drawer's track ran from nothing to the dearest price on the shelf, so
 * with no market chosen it reached the dearest sale and a renter's whole
 * market was the first sliver of it (the ₦0 to ₦520m complaint). The range is
 * now a fixed table per market, in naira, with a step a person would type:
 *
 *   Rent  ₦0 to ₦30m in ₦100k steps (a yearly rent, or on the Rent market
 *         the cash at the door, V-65); the top of the track reads "₦30m+"
 *   Buy   ₦0 to ₦500m in ₦5m steps
 *
 * With no market chosen the track is the Rent scale, because renting is what
 * most people on the Property side are doing; a buyer picks Buy and the track
 * rescales. The ends never depend on what happens to be listed today.
 */
export type PriceScale = { floor: number; ceiling: number; step: number; span: number };

export const PRICE_BOUNDS: Record<ListingIntent, { ceiling: number; step: number }> = {
  rent: { ceiling: 30_000_000, step: 100_000 },
  sale: { ceiling: 500_000_000, step: 5_000_000 },
};

export function priceScale(intent: ListingIntent | undefined): PriceScale {
  const { ceiling, step } = PRICE_BOUNDS[intent ?? "rent"];
  return { floor: 0, ceiling, step, span: ceiling };
}
