import { describe, expect, it } from "vitest";
import { bookNowChoice, planRefundable, type StayDetail, type StayRatePlan } from "./detail-model";

const FREE = { id: "p1", name: "Free", summary: "", freeUntilHours: 48, rules: [{ refund_bps: 10000, hours_before: 48 }, { refund_bps: 0, hours_before: 0 }] };
const NONE = { id: "p2", name: "Non-refundable", summary: "", freeUntilHours: null, rules: [{ refund_bps: 0, hours_before: 0 }] };

function plan(id: string, rateMinor: number, policy: StayRatePlan["policy"]): StayRatePlan {
  return { id, name: id, mealPlan: "room_only", rateMinor, minStayNights: 1, maxStayNights: null, policy };
}

const detail = (plans: StayRatePlan[]): StayDetail => ({
  id: "s",
  name: "Stay",
  description: null,
  starRating: null,
  city: "Lagos",
  area: "Ikoyi",
  checkInFrom: null,
  checkOutBy: null,
  houseRules: null,
  photos: [],
  amenities: [],
  policy: null,
  roomTypes: [
    { id: "r", name: "Room", category: "double", description: null, sleeps: 2, baseRateMinor: 0, sizeSqm: null, ratePlans: plans },
  ],
});

describe("planRefundable", () => {
  it("reads the rules, not the sentence", () => {
    expect(planRefundable(plan("a", 1, FREE))).toBe(true);
    expect(planRefundable(plan("b", 1, NONE))).toBe(false);
    expect(planRefundable(plan("c", 1, null))).toBe(false);
  });
});

describe("bookNowChoice", () => {
  it("picks the cheapest refundable rate and names the cheaper one it passed over", () => {
    const choice = bookNowChoice(detail([plan("cheap", 8_500_000, NONE), plan("flex", 9_500_000, FREE)]), 3, 2);
    expect(choice?.pick.plan.id).toBe("flex");
    expect(choice?.refundable).toBe(true);
    expect(choice?.cheaperNonRefundable?.plan.id).toBe("cheap");
  });

  it("falls back to the cheapest when nothing is refundable, and says so", () => {
    const choice = bookNowChoice(detail([plan("cheap", 8_500_000, NONE)]), 3, 2);
    expect(choice?.pick.plan.id).toBe("cheap");
    expect(choice?.refundable).toBe(false);
    expect(choice?.cheaperNonRefundable).toBeNull();
  });

  it("does not offer a comparison when the refundable rate is already the cheapest", () => {
    const choice = bookNowChoice(detail([plan("flex", 8_000_000, FREE), plan("cheap", 8_500_000, NONE)]), 3, 2);
    expect(choice?.pick.plan.id).toBe("flex");
    expect(choice?.cheaperNonRefundable).toBeNull();
  });

  it("answers null when no room takes the party", () => {
    expect(bookNowChoice(detail([plan("flex", 1, FREE)]), 3, 5)).toBeNull();
  });
});
