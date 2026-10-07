import { formatDate, formatMoney, formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import { promotionTierPriceText } from "@/lib/money/copy";
import {
  FRONT_DOOR_RAIL,
  PROMOTION_TIER_TABLE,
  isFrontDoorTier,
  perDayKobo,
  type FrontDoorTierSlug,
  type PromotionTier,
  type PromotionTierSlug,
} from "./tiers";

/**
 * THE FRONT DOOR'S PROMOTED RAIL, AND WHAT A BUYER IS TOLD BEFORE PAYING
 * (`VALLO_PROMOTION-v2.md` section 11; statements 2, 3 and 5).
 *
 * Pure, so each rule is tested without rendering. The numbers are
 * `FRONT_DOOR_RAIL`'s, never typed here.
 */

type PromotionWords = Dictionary["experienceFeatures"]["promotion"];

/** A paid place on the rail, as Session 2's inventory read will hand it over. */
export type RailInput = { slotId?: unknown; tier: PromotionTierSlug };

export type RailRefusal = "unpaid" | "not-front-door" | "tier-full" | "rail-full";

/**
 * Which of the paid places the rail draws, in the order the inventory gave
 * them, and why each other one is refused:
 *   - "unpaid": no paid slot id. An organic listing can never fill a gap.
 *   - "not-front-door": a tier that does not buy the front door.
 *   - "tier-full": Everywhere past two, Featured past four.
 *   - "rail-full": a seventh place, or later.
 * Nothing is sorted, reweighted or added: fewer paid places, fewer cards.
 */
export function railSlots<T extends RailInput>(inputs: readonly T[]): { shown: T[]; refused: { input: T; reason: RailRefusal }[] } {
  const shown: T[] = [];
  const refused: { input: T; reason: RailRefusal }[] = [];
  const perTier = new Map<FrontDoorTierSlug, number>();
  const seen = new Set<string>();
  for (const input of inputs) {
    const slotId = typeof input.slotId === "string" ? input.slotId.trim() : "";
    if (!slotId || seen.has(slotId)) {
      refused.push({ input, reason: "unpaid" });
      continue;
    }
    if (!isFrontDoorTier(input.tier) || !PROMOTION_TIER_TABLE[input.tier].limitations.frontDoor) {
      refused.push({ input, reason: "not-front-door" });
      continue;
    }
    const held = perTier.get(input.tier) ?? 0;
    if (held >= FRONT_DOOR_RAIL.maxPerTier[input.tier]) {
      refused.push({ input, reason: "tier-full" });
      continue;
    }
    if (shown.length >= FRONT_DOOR_RAIL.placesPerCityPerDay) {
      refused.push({ input, reason: "rail-full" });
      continue;
    }
    seen.add(slotId);
    perTier.set(input.tier, held + 1);
    shown.push(input);
  }
  return { shown, refused };
}

/** One tier's price line: price, days and naira a day (money words from `lib/money/copy.ts`). */
export function tierPriceLine(tier: Pick<PromotionTier, "priceKobo" | "durationDays">, locale?: Locale): string {
  return promotionTierPriceText(
    formatMoney(tier.priceKobo, locale),
    formatNumber(tier.durationDays, locale),
    formatMoney(perDayKobo(tier), locale),
  );
}

/** The published count, said before payment: six a day per city, Everywhere at most two, Featured at most four. */
export function frontDoorCountText(p: PromotionWords, locale?: Locale): string {
  return p.frontDoor.count
    .replace("{places}", formatNumber(FRONT_DOOR_RAIL.placesPerCityPerDay, locale))
    .replace("{prime}", p.tiers.prime.name)
    .replace("{primeMax}", formatNumber(FRONT_DOOR_RAIL.maxPerTier.prime, locale))
    .replace("{featured}", p.tiers.featured.name)
    .replace("{featuredMax}", formatNumber(FRONT_DOOR_RAIL.maxPerTier.featured, locale));
}

/**
 * One front door tier's day, as Session 2's sale will answer it (the sale is
 * Session 2's; this is the shape its read hands the screen):
 *   not-live  the inventory does not exist yet: nothing is said about a day.
 *   open      `free` places this tier can still take on `day`.
 *   full      refused, with the named reason and the next free day, or null
 *             when no later day is open to book.
 * Days are Lagos calendar days, `YYYY-MM-DD`.
 */
export type FrontDoorDay =
  | { state: "not-live" }
  | { state: "open"; tier: FrontDoorTierSlug; day: string; free: number }
  | { state: "full"; tier: FrontDoorTierSlug; day: string; reason: "rail-full" | "tier-full"; nextFree: string | null };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function dayText(day: string, locale?: Locale): string | null {
  if (!DAY.test(day)) return null;
  const at = new Date(`${day}T12:00:00+01:00`);
  return Number.isNaN(at.getTime()) ? null : formatDate(at, locale, { weekday: "long", day: "numeric", month: "long" });
}

/**
 * What the purchase screen says about a day: nothing while not live; the
 * free places when open; the named reason and the next free day when full.
 * A day it cannot read as a date says nothing rather than something wrong.
 */
export function frontDoorDayLines(read: FrontDoorDay, p: PromotionWords, locale?: Locale): string[] {
  if (read.state === "not-live") return [];
  const date = dayText(read.day, locale);
  if (!date) return [];
  if (read.state === "open") {
    const free = Math.min(Math.max(0, Math.trunc(read.free)), FRONT_DOOR_RAIL.maxPerTier[read.tier]);
    return [
      p.frontDoor.open
        .replace("{tier}", p.tiers[read.tier].name)
        .replace("{n}", formatNumber(free, locale))
        .replace("{date}", date),
    ];
  }
  const reason =
    read.reason === "rail-full"
      ? p.frontDoor.railFull.replace("{places}", formatNumber(FRONT_DOOR_RAIL.placesPerCityPerDay, locale)).replace("{date}", date)
      : p.frontDoor.tierFull
          .replace("{tier}", p.tiers[read.tier].name)
          .replace("{max}", formatNumber(FRONT_DOOR_RAIL.maxPerTier[read.tier], locale))
          .replace("{date}", date);
  const next = read.nextFree ? dayText(read.nextFree, locale) : null;
  return [reason, next ? p.frontDoor.nextFree.replace("{date}", next) : p.frontDoor.noNextFree];
}
