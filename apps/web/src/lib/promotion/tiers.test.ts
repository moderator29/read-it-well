import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { withoutComments } from "@/lib/copy/source-scan";
import {
  FRONT_DOOR_RAIL,
  PROMOTION_METRICS,
  PROMOTION_TIERS,
  PROMOTION_TIER_TABLE,
  byReach,
  isPromotionTier,
  perDayKobo,
  promotionTiers,
} from "./tiers";

/**
 * THE TIER TABLE HOLDS THE SPEC (`docs/promotion/VALLO_PROMOTION.md`, and
 * section 11 of v2, the founder's confirmed answers of 6 October) AND ITS
 * GUARDRAILS, without rendering anything.
 */
const t = getDictionary("en");

describe("the four tiers, as the spec writes them", () => {
  it("are laid out by how far they reach: Boost, Spotlight, Featured, Everywhere", () => {
    expect(promotionTiers().map((tier) => tier.slug)).toEqual(["boost", "spotlight", "featured", "prime"]);
    expect(promotionTiers().map((tier) => tier.reachOrder)).toEqual([1, 2, 3, 4]);
  });

  it("orders by the explicit reach field and never by price", () => {
    /* The same four with their prices reversed and the input shuffled: the
       order is still reach, so a price change can never reorder the ladder. */
    const prices = promotionTiers().map((tier) => tier.priceKobo).reverse();
    const repriced = promotionTiers().map((tier, i) => ({ ...tier, priceKobo: prices[i]! }));
    const shuffled = [repriced[2]!, repriced[0]!, repriced[3]!, repriced[1]!];
    expect(byReach(shuffled).map((tier) => tier.slug)).toEqual(["boost", "spotlight", "featured", "prime"]);
    const source = withoutComments(readFileSync(join(__dirname, "tiers.ts"), "utf8"));
    expect(source).not.toMatch(/sort\([^)]*price/i);
  });

  it("carry the founder's confirmed prices in kobo, with no proposed marking left", () => {
    expect(PROMOTION_TIER_TABLE.boost.priceKobo).toBe(250_000);
    expect(PROMOTION_TIER_TABLE.spotlight.priceKobo).toBe(750_000);
    expect(PROMOTION_TIER_TABLE.featured.priceKobo).toBe(2_000_000);
    expect(PROMOTION_TIER_TABLE.prime.priceKobo).toBe(5_000_000);
    for (const tier of promotionTiers()) {
      expect(Number.isInteger(tier.priceKobo)).toBe(true);
      expect(tier).not.toHaveProperty("priceStatus");
      expect(tier).not.toHaveProperty("proposedPriceKobo");
    }
    const code = withoutComments(readFileSync(join(__dirname, "tiers.ts"), "utf8"));
    expect(code).not.toMatch(/proposed/i);
  });

  it("works out the naira a day by integer maths: 357, 536, 667 and 1,667", () => {
    expect(promotionTiers().map((tier) => perDayKobo(tier) / 100)).toEqual([357, 536, 667, 1667]);
    for (const tier of promotionTiers()) expect(Number.isInteger(perDayKobo(tier))).toBe(true);
    /* Computed from price and days, not stored: change either and it follows. */
    expect(perDayKobo({ priceKobo: 700_000, durationDays: 7 })).toBe(100_000);
    expect(perDayKobo({ priceKobo: 250_000, durationDays: 0 })).toBe(0);
  });

  it("charges more for reaching further, not for lasting longer", () => {
    const perDay = promotionTiers().map((tier) => perDayKobo(tier));
    expect([...perDay].sort((a, b) => a - b)).toEqual(perDay);
  });

  it("carry the spec's durations and limits", () => {
    expect(promotionTiers().map((tier) => tier.durationDays)).toEqual([7, 14, 30, 30]);
    expect(PROMOTION_TIER_TABLE.boost.limitations.maxActivePerListing).toBe(1);
    expect(PROMOTION_TIER_TABLE.spotlight.limitations.carouselShare).toBe(6);
    expect(PROMOTION_TIER_TABLE.prime.limitations.slotsPerCityPerDay).toBe(2);
    expect(PROMOTION_TIER_TABLE.featured.limitations.slotsPerCityPerDay).toBe(4);
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

  it("publishes the front door count in one place: six a day per city, Everywhere at most two, Featured at most four", () => {
    expect(FRONT_DOOR_RAIL.placesPerCityPerDay).toBe(6);
    expect(FRONT_DOOR_RAIL.maxPerTier).toEqual({ prime: 2, featured: 4 });
    /* The tier rows read the rail's numbers rather than restating them. */
    expect(PROMOTION_TIER_TABLE.prime.limitations.slotsPerCityPerDay).toBe(FRONT_DOOR_RAIL.maxPerTier.prime);
    expect(PROMOTION_TIER_TABLE.featured.limitations.slotsPerCityPerDay).toBe(FRONT_DOOR_RAIL.maxPerTier.featured);
    const code = withoutComments(readFileSync(join(__dirname, "tiers.ts"), "utf8"));
    expect(code.match(/slotsPerCityPerDay:\s*\d/g)).toBeNull();
    /* Everywhere is scarcer than Featured on purpose. */
    expect(FRONT_DOOR_RAIL.maxPerTier.prime).toBeLessThan(FRONT_DOOR_RAIL.maxPerTier.featured);
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

  it("the fourth tier is keyed prime and reads Everywhere, confirmed, with no proposed marking in its words", () => {
    expect(PROMOTION_TIER_TABLE.prime.slug).toBe("prime");
    expect(t.experienceFeatures.promotion.tiers.prime.name).toBe("Everywhere");
    expect(JSON.stringify(t.experienceFeatures.promotion)).not.toMatch(/proposed|to be confirmed/i);
    expect(JSON.stringify(t.experienceFeatures.firstRun.promotion)).not.toMatch(/proposed|to be confirmed/i);
  });
});

describe("guardrail 5: the tier carries no trust", () => {
  it("has no badge, tick, verification or rank field anywhere in the type or the table", () => {
    const source = withoutComments(readFileSync(join(__dirname, "tiers.ts"), "utf8"));
    expect(source).not.toMatch(/badge|verified|verification|tick|rank|score|weight|boostFactor/i);
  });
});
