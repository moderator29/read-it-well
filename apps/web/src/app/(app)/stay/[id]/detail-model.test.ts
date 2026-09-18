import { describe, expect, it } from "vitest";
import {
  orderedRooms,
  planAcceptsNights,
  ratePlanTotalMinor,
  roomFromMinor,
  stayFromMinor,
  type StayDetail,
  type StayRatePlan,
  type StayRoomType,
} from "./detail-model";

function plan(id: string, rateMinor: number, over: Partial<StayRatePlan> = {}): StayRatePlan {
  return {
    id,
    name: `Plan ${id}`,
    mealPlan: "room_only",
    rateMinor,
    minStayNights: 1,
    maxStayNights: null,
    policy: null,
    ...over,
  };
}

function room(id: string, over: Partial<StayRoomType> = {}): StayRoomType {
  return {
    id,
    name: `Room ${id}`,
    category: "double",
    description: null,
    sleeps: 2,
    baseRateMinor: 0,
    sizeSqm: null,
    ratePlans: [],
    ...over,
  };
}

function detail(rooms: StayRoomType[]): StayDetail {
  return {
    id: "acc",
    name: "The Wheatbaker",
    description: null,
    starRating: null,
    city: "Lagos",
    area: "Ikoyi",
    checkInFrom: null,
    checkOutBy: null,
    houseRules: null,
    photos: [],
    amenities: [],
    roomTypes: rooms,
    policy: null,
  };
}

describe("a rate plan's total", () => {
  it("is the rate times the nights, and nothing else added on the way", () => {
    expect(ratePlanTotalMinor(plan("a", 120_000_00), 3)).toBe(360_000_00);
  });

  it("has no total without dates", () => {
    expect(ratePlanTotalMinor(plan("a", 120_000_00), null)).toBeNull();
  });

  it("refuses a stay shorter than the minimum rather than quoting one checkout will reject", () => {
    expect(ratePlanTotalMinor(plan("a", 100_00, { minStayNights: 2 }), 1)).toBeNull();
    expect(ratePlanTotalMinor(plan("a", 100_00, { minStayNights: 2 }), 2)).toBe(200_00);
  });

  it("refuses a stay longer than the maximum", () => {
    const capped = plan("a", 100_00, { maxStayNights: 5 });
    expect(ratePlanTotalMinor(capped, 6)).toBeNull();
    expect(ratePlanTotalMinor(capped, 5)).toBe(500_00);
  });

  it("accepts any length when no dates are chosen yet", () => {
    expect(planAcceptsNights(plan("a", 100_00, { minStayNights: 3 }), null)).toBe(true);
  });
});

describe("the from price", () => {
  it("is the cheapest plan on the room, not the base rate", () => {
    const r = room("r", {
      baseRateMinor: 200_000_00,
      ratePlans: [plan("flex", 150_000_00), plan("saver", 120_000_00)],
    });
    expect(roomFromMinor(r)).toBe(120_000_00);
  });

  it("falls back to the base rate only for a room with no plans written yet", () => {
    expect(roomFromMinor(room("r", { baseRateMinor: 90_000_00 }))).toBe(90_000_00);
  });

  it("is null when a room has plans but none can take this stay", () => {
    const r = room("r", { baseRateMinor: 90_000_00, ratePlans: [plan("a", 100_00, { minStayNights: 7 })] });
    expect(roomFromMinor(r, 2)).toBeNull();
  });

  it("never quotes a price this party cannot actually book", () => {
    const cheapButUnavailable = room("a", { ratePlans: [plan("x", 50_000_00, { minStayNights: 14 })] });
    const bookable = room("b", { ratePlans: [plan("y", 80_000_00)] });
    expect(stayFromMinor(detail([cheapButUnavailable, bookable]), 2)).toBe(80_000_00);
  });

  it("has no figure at all for a property with nothing priced", () => {
    expect(stayFromMinor(detail([room("a")]))).toBeNull();
  });
});

describe("the room order", () => {
  it("puts what the party fits in first, then cheapest", () => {
    const rooms = [
      room("small", { sleeps: 1, ratePlans: [plan("a", 40_000_00)] }),
      room("suite", { sleeps: 4, ratePlans: [plan("b", 300_000_00)] }),
      room("double", { sleeps: 2, ratePlans: [plan("c", 90_000_00)] }),
    ];
    expect(orderedRooms(detail(rooms), 2).map((r) => r.id)).toEqual(["double", "suite", "small"]);
  });

  it("keeps rooms that are too small visible rather than hiding the property's range", () => {
    const rooms = [room("small", { sleeps: 1 }), room("double", { sleeps: 2 })];
    expect(orderedRooms(detail(rooms), 2)).toHaveLength(2);
  });
});
