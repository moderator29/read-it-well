/**
 * THE FOUR PROMOTION TIERS, AS DATA (D3, D60; `docs/promotion/VALLO_PROMOTION.md`).
 *
 * The spec is the authority and this file is its table, typed, so the
 * onboarding, the promoted slot and the measurement shell read one source
 * and a test can hold every row to the guardrails without rendering.
 *
 * WHAT THIS FILE IS NOT. It is not the price list Vallo charges. Session 2
 * owns the pricing rows (effective dated, `fee_rates` style), the inventory,
 * the purchase and the measurement. Until those exist, the prices below are
 * PROPOSED, in the D38 pattern ("build to the value, never wait for it"): the
 * founder confirms them, and a change is one row on Session 2's side. Nothing
 * here can take money: there is no purchase path in this codebase, because
 * selling waits on the Paystack company account (D38, D60).
 *
 * THE GUARDRAILS EVERY ROW KEEPS (D3, spec "The guardrails"):
 *   - A tier buys a MARKED SLOT. Nothing here is, or may ever become, an input
 *     to organic ranking (`lib/listings/ranking.test.ts` keeps asserting so).
 *   - Tier names say what you get. `prime` is the slug Session 2 keys on; the
 *     name a member reads is in the dictionary, where the spec's recommended
 *     "Everywhere" stands until the founder confirms it (a one-line change).
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

export type PromotionTier = {
  slug: PromotionTierSlug;
  /** The key of this tier's words under `experienceFeatures.promotion.tiers`. */
  displayKey: PromotionTierSlug;
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
  /** Integer kobo. Proposed, not decided (D38 pattern, D60). */
  proposedPriceKobo: number;
  priceStatus: "proposed";
  limitations: {
    /** How many of this tier one listing may hold at once. */
    maxActivePerListing: number | null;
    /** How many listings share one carousel, rotated evenly. */
    carouselShare: number | null;
    /**
     * Front door and map slots per city per day, sold first come and never
     * oversold. `null` where the spec leaves the number to Session 2
     * ("a fixed number"); the buyer must be shown it before paying.
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
    proposedPriceKobo: 2_500_00,
    priceStatus: "proposed",
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
    proposedPriceKobo: 7_500_00,
    priceStatus: "proposed",
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
    proposedPriceKobo: 20_000_00,
    priceStatus: "proposed",
    limitations: {
      maxActivePerListing: null,
      carouselShare: null,
      /* "A fixed number of front door slots per city per day": the spec does
         not set it, so Session 2 does, and the buyer sees it before paying. */
      slotsPerCityPerDay: null,
      frontDoor: true,
      requiresReviewedListingWithInspection: false,
    },
  },
  prime: {
    slug: "prime",
    displayKey: "prime",
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
    proposedPriceKobo: 50_000_00,
    priceStatus: "proposed",
    limitations: {
      maxActivePerListing: null,
      carouselShare: null,
      slotsPerCityPerDay: 2,
      frontDoor: true,
      requiresReviewedListingWithInspection: true,
    },
  },
};

/** The four tiers, cheapest first, as the onboarding lays them side by side. */
export function promotionTiers(): PromotionTier[] {
  return PROMOTION_TIERS.map((slug) => PROMOTION_TIER_TABLE[slug]);
}
