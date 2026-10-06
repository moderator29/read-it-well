/**
 * THE FOUR PROMOTION TIERS, AS DATA (D3, D60; `docs/promotion/VALLO_PROMOTION.md`).
 *
 * The spec is the authority and this file is its table, typed, so the
 * onboarding, the promoted slot and the measurement shell read one source
 * and a test can hold every row to the guardrails without rendering.
 *
 * THE PRICES ARE CONFIRMED (founder, 6 October; `VALLO_PROMOTION-v2.md`
 * section 11): 2,500, 7,500, 20,000 and 50,000 naira. Session 2 owns the
 * pricing rows (effective dated, `fee_rates` style), the inventory, the
 * purchase and the measurement, so a later change is one row on its side and
 * this table follows it. Nothing here can take money: there is no purchase
 * path in this codebase, because selling waits on the Paystack company
 * account (D38, D60).
 *
 * THE ORDER IS REACH, NEVER PRICE. The ladder "does not reward buying longer,
 * it charges more for reaching further" (section 11), so the tiers are laid
 * out by `reachOrder`, an explicit field, and nothing sorts them by money.
 *
 * THE FRONT DOOR'S PUBLISHED COUNT LIVES HERE AND NOWHERE ELSE
 * (`FRONT_DOOR_RAIL`): one labelled rail per city, six places a day,
 * Everywhere at most two of them, Featured at most four. The rail, the
 * onboarding and the purchase screen all read these numbers from this one
 * constant.
 *
 * THE GUARDRAILS EVERY ROW KEEPS (D3, spec "The guardrails"):
 *   - A tier buys a MARKED SLOT. Nothing here is, or may ever become, an input
 *     to organic ranking (`lib/listings/ranking.test.ts` keeps asserting so).
 *   - Tier names say what you get. `prime` is the slug Session 2 keys on; the
 *     name a member reads is in the dictionary: "Everywhere", confirmed by the
 *     founder on 6 October.
 *   - No tier carries a trust mark. There is no badge, tick or verification
 *     field in this type, on purpose: the badge is never for sale.
 *
 * Client-safe: constants only. Words live in the dictionary
 * (`experienceFeatures.promotion`), never here.
 */

export const PROMOTION_TIERS = ["boost", "spotlight", "featured", "prime"] as const;
export type PromotionTierSlug = (typeof PROMOTION_TIERS)[number];

export function isPromotionTier(value: unknown): value is PromotionTierSlug {
  return typeof value === "string" && (PROMOTION_TIERS as readonly string[]).includes(value);
}

/**
 * The ten metrics of F4, in the spec's order. A tier names which of them its
 * measurement screen shows; a metric a tier does not include is not shown,
 * and a metric with nothing behind it shows as no data, never as zero.
 */
export const PROMOTION_METRICS = [
  "impressions",
  "views",
  "uniqueViewers",
  "saves",
  "shares",
  "inquiries",
  "contacts",
  "viewings",
  "bookings",
  "transactions",
] as const;
export type PromotionMetric = (typeof PROMOTION_METRICS)[number];

/** Where a promoted slot can appear. Each is a marked slot from separate inventory. */
export type PromotionPlacement =
  | "area_page_slot"
  | "area_search_slot"
  | "area_carousel"
  | "front_door_slot"
  | "city_page_slot"
  | "saved_search_digest"
  | "area_digest_email"
  | "map_slot";

/** How far the attention reaches. */
export type PromotionExposure = "area" | "area_repeated" | "city" | "platform";

/**
 * THE FRONT DOOR RAIL, THE PUBLISHED COUNT (section 11, confirmed 6 October).
 * One labelled promoted rail per city; six places on it per day; Everywhere
 * may hold at most two of them and Featured at most four. Never a seventh
 * card, and never an unpaid listing to fill a gap.
 */
export const FRONT_DOOR_RAIL = {
  placesPerCityPerDay: 6,
  maxPerTier: { prime: 2, featured: 4 },
} as const satisfies { placesPerCityPerDay: number; maxPerTier: Partial<Record<PromotionTierSlug, number>> };

/** The front door tiers and their caps, as the rail enforces them. */
export type FrontDoorTierSlug = keyof typeof FRONT_DOOR_RAIL.maxPerTier;
export function isFrontDoorTier(slug: PromotionTierSlug): slug is FrontDoorTierSlug {
  return Object.prototype.hasOwnProperty.call(FRONT_DOOR_RAIL.maxPerTier, slug);
}

export type PromotionTier = {
  slug: PromotionTierSlug;
  /** The key of this tier's words under `experienceFeatures.promotion.tiers`. */
  displayKey: PromotionTierSlug;
  /**
   * How far the tier reaches, 1 the nearest (one area) to 4 the furthest
   * (every surface). The ONLY thing the tiers are ordered by.
   */
  reachOrder: 1 | 2 | 3 | 4;
  durationDays: number;
  placement: readonly PromotionPlacement[];
  exposure: PromotionExposure;
  analytics: {
    metrics: readonly PromotionMetric[];
    /** A per-day curve of the tier's metrics. */
    perDayCurve: boolean;
    /** Organic against promoted, shown ONLY where statistically valid; otherwise the screen says so. */
    organicComparison: boolean;
    viewerQuality: boolean;
    export: boolean;
  };
  /** Integer kobo, confirmed by the founder on 6 October. */
  priceKobo: number;
  limitations: {
    /** How many of this tier one listing may hold at once. */
    maxActivePerListing: number | null;
    /** How many listings share one carousel, rotated evenly. */
    carouselShare: number | null;
    /**
     * Front door places this tier may hold per city per day, sold first come
     * and never oversold; read from `FRONT_DOOR_RAIL`, never typed here.
     * `null` for a tier that does not reach the front door.
     */
    slotsPerCityPerDay: number | null;
    frontDoor: boolean;
    /** Everywhere's entry condition: a reviewed listing with photographs and a complete inspection record. */
    requiresReviewedListingWithInspection: boolean;
  };
};

const ALL_TEN = PROMOTION_METRICS;

export const PROMOTION_TIER_TABLE: Readonly<Record<PromotionTierSlug, PromotionTier>> = {
  boost: {
    slug: "boost",
    displayKey: "boost",
    reachOrder: 1,
    durationDays: 7,
    placement: ["area_page_slot", "area_search_slot"],
    exposure: "area",
    analytics: {
      metrics: ["impressions", "views", "uniqueViewers", "saves", "inquiries"],
      perDayCurve: false,
      organicComparison: false,
      viewerQuality: false,
      export: false,
    },
    priceKobo: 2_500_00,
    limitations: {
      maxActivePerListing: 1,
      carouselShare: null,
      slotsPerCityPerDay: null,
      frontDoor: false,
      requiresReviewedListingWithInspection: false,
    },
  },
  spotlight: {
    slug: "spotlight",
    displayKey: "spotlight",
    reachOrder: 2,
    durationDays: 14,
    placement: ["area_carousel", "area_page_slot", "area_search_slot"],
    exposure: "area_repeated",
    analytics: {
      metrics: ["impressions", "views", "uniqueViewers", "saves", "inquiries", "shares", "contacts"],
      perDayCurve: true,
      organicComparison: false,
      viewerQuality: false,
      export: false,
    },
    priceKobo: 7_500_00,
    limitations: {
      maxActivePerListing: null,
      carouselShare: 6,
      slotsPerCityPerDay: null,
      frontDoor: false,
      requiresReviewedListingWithInspection: false,
    },
  },
  featured: {
    slug: "featured",
    displayKey: "featured",
    reachOrder: 3,
    durationDays: 30,
    placement: ["front_door_slot", "city_page_slot", "area_page_slot", "area_search_slot"],
    exposure: "city",
    analytics: {
      metrics: ALL_TEN,
      perDayCurve: true,
      organicComparison: true,
      viewerQuality: false,
      export: false,
    },
    priceKobo: 20_000_00,
    limitations: {
      maxActivePerListing: null,
      carouselShare: null,
      slotsPerCityPerDay: FRONT_DOOR_RAIL.maxPerTier.featured,
      frontDoor: true,
      requiresReviewedListingWithInspection: false,
    },
  },
  prime: {
    slug: "prime",
    displayKey: "prime",
    reachOrder: 4,
    durationDays: 30,
    placement: [
      "front_door_slot",
      "city_page_slot",
      "area_page_slot",
      "area_search_slot",
      "saved_search_digest",
      "area_digest_email",
      "map_slot",
    ],
    exposure: "platform",
    analytics: {
      metrics: ALL_TEN,
      perDayCurve: true,
      organicComparison: true,
      viewerQuality: true,
      export: true,
    },
    priceKobo: 50_000_00,
    limitations: {
      maxActivePerListing: null,
      carouselShare: null,
      slotsPerCityPerDay: FRONT_DOOR_RAIL.maxPerTier.prime,
      frontDoor: true,
      requiresReviewedListingWithInspection: true,
    },
  },
};

/**
 * Tiers laid out by how far they reach, nearest first: Boost, Spotlight,
 * Featured, Everywhere. By `reachOrder` alone; price is never consulted, so a
 * price change can never reorder the ladder.
 */
export function byReach(tiers: readonly PromotionTier[]): PromotionTier[] {
  return [...tiers].sort((a, b) => a.reachOrder - b.reachOrder);
}

/** The four tiers, by reach, as the onboarding and the purchase screen lay them side by side. */
export function promotionTiers(): PromotionTier[] {
  return byReach(PROMOTION_TIERS.map((slug) => PROMOTION_TIER_TABLE[slug]));
}

/**
 * WHAT A TIER COSTS PER DAY, IN WHOLE NAIRA, BY INTEGER MATHS ONLY.
 *
 * The kobo per day is floored (`priceKobo` divided by the days, whole kobo),
 * then written to the nearest whole naira by integer floor of kobo plus fifty
 * over a hundred. That gives the founder's published column (357, 536, 667,
 * 1,667); a plain floor to the naira would print 535, 666 and 1,666. No float
 * division reaches the figure. Returned as kobo of a whole naira, for
 * `formatMoney`.
 */
export function perDayKobo(tier: Pick<PromotionTier, "priceKobo" | "durationDays">): number {
  const days = Math.trunc(tier.durationDays);
  if (!Number.isInteger(tier.priceKobo) || days <= 0) return 0;
  const koboPerDay = Math.floor(tier.priceKobo / days);
  return Math.floor((koboPerDay + 50) / 100) * 100;
}
