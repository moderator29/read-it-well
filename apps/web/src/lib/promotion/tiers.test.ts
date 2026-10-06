import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { withoutComments } from "@/lib/copy/source-scan";
import { PROMOTION_METRICS, PROMOTION_TIERS, PROMOTION_TIER_TABLE, isPromotionTier, promotionTiers } from "./tiers";

/**
 * THE TIER TABLE HOLDS THE SPEC (`docs/promotion/VALLO_PROMOTION.md`) AND ITS
 * GUARDRAILS, without rendering anything.
 */
const t = getDictionary("en");

describe("the four tiers, as the spec writes them", () => {
  it("are keyed boost, spotlight, featured, prime, cheapest first", () => {
    expect(promotionTiers().map((tier) => tier.slug)).toEqual(["boost", "spotlight", "featured", "prime"]);
    const prices = promotionTiers().map((tier) => tier.proposedPriceKobo);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it("carry the spec's proposed prices in kobo, marked proposed (D38 pattern)", () => {
    expect(PROMOTION_TIER_TABLE.boost.proposedPriceKobo).toBe(250_000);
    expect(PROMOTION_TIER_TABLE.spotlight.proposedPriceKobo).toBe(750_000);
    expect(PROMOTION_TIER_TABLE.featured.proposedPriceKobo).toBe(2_000_000);
    expect(PROMOTION_TIER_TABLE.prime.proposedPriceKobo).toBe(5_000_000);
    for (const tier of promotionTiers()) {
      expect(tier.priceStatus).toBe("proposed");
      expect(Number.isInteger(tier.proposedPriceKobo)).toBe(true);
    }
  });

  it("carry the spec's durations and limits", () => {
    expect(promotionTiers().map((tier) => tier.durationDays)).toEqual([7, 14, 30, 30]);
    expect(PROMOTION_TIER_TABLE.boost.limitations.maxActivePerListing).toBe(1);
    expect(PROMOTION_TIER_TABLE.spotlight.limitations.carouselShare).toBe(6);
    expect(PROMOTION_TIER_TABLE.prime.limitations.slotsPerCityPerDay).toBe(2);
    expect(PROMOTION_TIER_TABLE.prime.limitations.requiresReviewedListingWithInspection).toBe(true);
    /* No front door below Featured. */
    expect(PROMOTION_TIER_TABLE.boost.limitations.frontDoor).toBe(false);
    expect(PROMOTION_TIER_TABLE.spotlight.limitations.frontDoor).toBe(false);
    expect(PROMOTION_TIER_TABLE.boost.placement).not.toContain("front_door_slot");
    expect(PROMOTION_TIER_TABLE.spotlight.placement).not.toContain("front_door_slot");
  });

  it("measure only the ten F4 metrics, Boost five, Featured and above all ten", () => {
    expect(PROMOTION_METRICS).toHaveLength(10);
    expect(PROMOTION_TIER_TABLE.boost.analytics.metrics).toHaveLength(5);
    expect(PROMOTION_TIER_TABLE.featured.analytics.metrics).toEqual(PROMOTION_METRICS);
    expect(PROMOTION_TIER_TABLE.prime.analytics.export).toBe(true);
    for (const tier of promotionTiers()) {
      for (const metric of tier.analytics.metrics) expect(PROMOTION_METRICS).toContain(metric);
    }
  });

  it("knows its own slugs and nothing else", () => {
    for (const slug of PROMOTION_TIERS) expect(isPromotionTier(slug)).toBe(true);
    for (const other of ["everywhere", "gold", "platinum", "", null, 3]) expect(isPromotionTier(other)).toBe(false);
  });
});

describe("guardrail 4: tier names say what you get", () => {
  it("every tier's words are in the dictionary, and no name is a rank", () => {
    for (const tier of promotionTiers()) {
      const words = t.experienceFeatures.promotion.tiers[tier.displayKey];
      expect(words.name.trim()).not.toBe("");
      expect(words.forWhom.trim()).not.toBe("");
      expect(words.name).not.toMatch(/gold|silver|platinum|premium|prime|vip/i);
    }
  });

  it("the fourth tier is keyed prime and reads as the spec's recommended Everywhere, until the founder says otherwise", () => {
    expect(PROMOTION_TIER_TABLE.prime.slug).toBe("prime");
    expect(t.experienceFeatures.promotion.tiers.prime.name).toBe("Everywhere");
  });
});

describe("guardrail 5: the tier carries no trust", () => {
  it("has no badge, tick, verification or rank field anywhere in the type or the table", () => {
    const source = withoutComments(readFileSync(join(__dirname, "tiers.ts"), "utf8"));
    expect(source).not.toMatch(/badge|verified|verification|tick|rank|score|weight|boostFactor/i);
  });
});
