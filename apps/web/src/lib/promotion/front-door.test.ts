import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { formatMoney } from "@vallo/i18n/core";
import { frontDoorCountText, frontDoorDayLines, railSlots, tierPriceLine, type RailInput } from "./front-door";
import { PROMOTION_TIER_TABLE, promotionTiers, type PromotionTierSlug } from "./tiers";

/**
 * THE FRONT DOOR RAIL AND WHAT THE BUYER IS TOLD BEFORE PAYING
 * (`VALLO_PROMOTION-v2.md` section 11; statements 2 and 5).
 */
const t = getDictionary("en");
const p = t.experienceFeatures.promotion;
const slots = (tier: PromotionTierSlug, n: number, from = 0): RailInput[] =>
  Array.from({ length: n }, (_, i) => ({ slotId: `${tier}-${from + i}`, tier }));

describe("the rail draws paid places only, never more than the published count", () => {
  it("seven paid inputs draw six: never a seventh card", () => {
    const seven = [...slots("prime", 2), ...slots("featured", 4), ...slots("featured", 1, 9)];
    const { shown, refused } = railSlots(seven);
    expect(shown).toHaveLength(6);
    expect(refused).toHaveLength(1);
    /* Seven with room under each cap still draw six. */
    const sevenMixed = [...slots("prime", 2), ...slots("featured", 4), { slotId: "late", tier: "prime" as const }];
    expect(railSlots(sevenMixed).shown).toHaveLength(6);
  });

  it("three Everywhere inputs draw two", () => {
    const { shown, refused } = railSlots(slots("prime", 3));
    expect(shown.map((s) => s.slotId)).toEqual(["prime-0", "prime-1"]);
    expect(refused.map((r) => r.reason)).toEqual(["tier-full"]);
  });

  it("five Featured inputs draw four", () => {
    const { shown, refused } = railSlots(slots("featured", 5));
    expect(shown).toHaveLength(4);
    expect(refused.map((r) => r.reason)).toEqual(["tier-full"]);
  });

  it("refuses an input without a paid slot id: an organic listing never fills a gap", () => {
    for (const slotId of [undefined, null, "", "   ", 7, {}]) {
      const { shown, refused } = railSlots([{ slotId, tier: "featured" }, ...slots("prime", 1)]);
      expect(shown.map((s) => s.slotId)).toEqual(["prime-0"]);
      expect(refused[0]?.reason).toBe("unpaid");
    }
    /* The same paid slot twice is one place, not two. */
    expect(railSlots([...slots("featured", 1), ...slots("featured", 1)]).shown).toHaveLength(1);
  });

  it("refuses a tier that does not buy the front door", () => {
    const { shown, refused } = railSlots([...slots("boost", 1), ...slots("spotlight", 1)]);
    expect(shown).toEqual([]);
    expect(refused.map((r) => r.reason)).toEqual(["not-front-door", "not-front-door"]);
  });

  it("on a day that is not sold out, draws fewer: two in, two drawn, in the inventory's order, nothing added", () => {
    const two = [...slots("featured", 1), ...slots("prime", 1)];
    expect(railSlots(two).shown).toEqual(two);
    expect(railSlots([]).shown).toEqual([]);
  });
});

describe("what the buyer is told before paying", () => {
  it("states the published count, from the one constant", () => {
    const text = frontDoorCountText(p, "en");
    expect(text).toContain("one Promoted rail per city");
    expect(text).toContain("6 places a day");
    expect(text).toContain("Everywhere can hold at most 2");
    expect(text).toContain("Featured at most 4");
    expect(text).not.toMatch(/\{\w+\}/);
  });

  it("prints each tier's price with its days and its naira a day", () => {
    expect(promotionTiers().map((tier) => tierPriceLine(tier, "en"))).toEqual([
      "₦2,500 for 7 days, ₦357 a day",
      "₦7,500 for 14 days, ₦536 a day",
      "₦20,000 for 30 days, ₦667 a day",
      "₦50,000 for 30 days, ₦1,667 a day",
    ]);
    expect(tierPriceLine(PROMOTION_TIER_TABLE.boost, "en")).toContain(formatMoney(250_000, "en"));
  });

  it("a full day says so with a named reason and the next free day", () => {
    const railFull = frontDoorDayLines({ state: "full", tier: "featured", day: "2026-10-09", reason: "rail-full", nextFree: "2026-10-13" }, p, "en");
    expect(railFull[0]).toBe("All 6 front door places for Friday, 9 October are taken.");
    expect(railFull[1]).toBe("The next day with a free place is Tuesday, 13 October.");

    const tierFull = frontDoorDayLines({ state: "full", tier: "prime", day: "2026-10-09", reason: "tier-full", nextFree: null }, p, "en");
    expect(tierFull[0]).toBe("Everywhere already holds its 2 front door places for Friday, 9 October.");
    expect(tierFull[1]).toBe(p.frontDoor.noNextFree);
  });

  it("an open day names the free places, never more than the tier may hold", () => {
    expect(frontDoorDayLines({ state: "open", tier: "featured", day: "2026-10-09", free: 3 }, p, "en")).toEqual([
      "Featured can still take 3 front door places on Friday, 9 October.",
    ]);
    expect(frontDoorDayLines({ state: "open", tier: "prime", day: "2026-10-09", free: 9 }, p, "en")[0]).toContain("take 2 ");
  });

  it("says nothing about a day it cannot read, or before the inventory exists", () => {
    expect(frontDoorDayLines({ state: "not-live" }, p, "en")).toEqual([]);
    expect(frontDoorDayLines({ state: "open", tier: "featured", day: "next week", free: 1 }, p, "en")).toEqual([]);
  });
});
