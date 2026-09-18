/**
 * THE STAY DETAIL, AS THE SCREEN NEEDS IT.
 *
 * The business-grade schema landed in M1 to M5 (`accommodations`,
 * `room_types`, `rate_plans`, `cancellation_policies`). This is the view
 * model over it: the exact columns the showcase reads, named the way the
 * screen speaks, so the surface can be built and tested without waiting on
 * the read, and so the read has one shape to satisfy rather than a component
 * tree to guess at.
 *
 * WHERE THE DATA COMES FROM. `lib/stays/queries.ts` is another worker's file
 * and is not written yet; `app/(app)/stay/[id]/page.tsx` carries the seam and
 * the exact signature it expects. Until it lands the page renders the
 * catalogue listing it always has, which is the honest answer while no
 * accommodation row exists: the shelf is real today and the business-grade
 * rows arrive as hosts onboard.
 *
 * THE ARITHMETIC IS THE CHECKOUT'S. A nightly rate times nights, and nothing
 * else added on the way to the headline. `stayTotalMinor` in `./model.ts`
 * does the same for a catalogue listing, and `reserve()` does it again on the
 * server; three places, one sum, and a test here that says so.
 */

/** Mirrors `public.meal_plan`. */
export type MealPlan = "room_only" | "breakfast" | "half_board" | "full_board";

/** Mirrors `public.room_category`. */
export type RoomCategory = "single" | "double" | "twin" | "suite" | "family" | "dorm";

/** One row of `cancellation_policies`, as the screen reads it. */
export type StayCancellationPolicy = {
  id: string;
  name: string;
  /** The policy's own sentence. Written by a human, shown verbatim. */
  summary: string;
  /** Free cancellation window in hours, when the policy grants one. */
  freeUntilHours: number | null;
};

/** One row of `rate_plans`, with its policy resolved. */
export type StayRatePlan = {
  id: string;
  name: string;
  mealPlan: MealPlan;
  /** Integer kobo, per night. */
  rateMinor: number;
  minStayNights: number;
  maxStayNights: number | null;
  policy: StayCancellationPolicy | null;
};

/** One row of `room_types`, with its active rate plans. */
export type StayRoomType = {
  id: string;
  name: string;
  category: RoomCategory;
  description: string | null;
  sleeps: number;
  /** Integer kobo. The rate before any plan is chosen. */
  baseRateMinor: number;
  sizeSqm: number | null;
  ratePlans: StayRatePlan[];
};

export type StayPhoto = { url: string; alt: string | null };

/** One row of `accommodations`, with everything the detail screen draws. */
export type StayDetail = {
  id: string;
  name: string;
  description: string | null;
  starRating: number | null;
  city: string | null;
  area: string | null;
  checkInFrom: string | null;
  checkOutBy: string | null;
  houseRules: string | null;
  photos: StayPhoto[];
  amenities: string[];
  roomTypes: StayRoomType[];
  policy: StayCancellationPolicy | null;
};

/**
 * What a rate includes, in words.
 *
 * `room_only` says nothing extra is included rather than saying "room only",
 * which reads as a restriction to somebody who has not met the phrase. The
 * other three are the words a hotel uses and a guest recognises.
 */
export const MEAL_PLAN_KEY: Record<MealPlan, "roomOnly" | "breakfast" | "halfBoard" | "fullBoard"> = {
  room_only: "roomOnly",
  breakfast: "breakfast",
  half_board: "halfBoard",
  full_board: "fullBoard",
};

export const ROOM_CATEGORY_KEY: Record<
  RoomCategory,
  "single" | "double" | "twin" | "suite" | "family" | "dorm"
> = {
  single: "single",
  double: "double",
  twin: "twin",
  suite: "suite",
  family: "family",
  dorm: "dorm",
};

/**
 * The total for a plan over a stay, in kobo.
 *
 * Null when the stay is not a stay yet (no dates) or the plan cannot take it,
 * because a number that ignores a minimum-stay rule is a number the checkout
 * will refuse, and finding that out at the payment step is the worst place to
 * find it out.
 */
export function ratePlanTotalMinor(plan: StayRatePlan, nights: number | null): number | null {
  if (nights === null || nights < 1) return null;
  if (nights < plan.minStayNights) return null;
  if (plan.maxStayNights !== null && nights > plan.maxStayNights) return null;
  return plan.rateMinor * nights;
}

/** Whether a plan can take a stay of this length at all. */
export function planAcceptsNights(plan: StayRatePlan, nights: number | null): boolean {
  if (nights === null) return true;
  if (nights < plan.minStayNights) return false;
  return plan.maxStayNights === null || nights <= plan.maxStayNights;
}

/**
 * The cheapest nightly rate a room type can actually be booked at.
 *
 * Rate plans first, because a plan's rate is what is charged; the room's base
 * rate is the fallback for a room nobody has written a plan for yet. Plans
 * that cannot take this stay are not counted, so the "from" price is never a
 * price this person cannot have.
 */
export function roomFromMinor(room: StayRoomType, nights: number | null = null): number | null {
  const usable = room.ratePlans.filter((plan) => planAcceptsNights(plan, nights));
  if (usable.length > 0) return Math.min(...usable.map((plan) => plan.rateMinor));
  if (room.ratePlans.length > 0) return null;
  return room.baseRateMinor > 0 ? room.baseRateMinor : null;
}

/** The cheapest nightly rate across the whole property. The ActionBar's figure. */
export function stayFromMinor(detail: StayDetail, nights: number | null = null): number | null {
  const prices = detail.roomTypes
    .map((room) => roomFromMinor(room, nights))
    .filter((price): price is number => price !== null);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** Rooms that sleep this party, largest first is not wanted: cheapest first is. */
export function roomsForGuests(detail: StayDetail, guests: number): StayRoomType[] {
  return detail.roomTypes.filter((room) => room.sleeps >= guests);
}

/**
 * The room list, in the order a person reads it: what they can book, cheapest
 * first, then the rooms too small for the party, which stay visible because
 * hiding them makes a property look emptier than it is.
 */
export function orderedRooms(detail: StayDetail, guests: number): StayRoomType[] {
  const price = (room: StayRoomType) => roomFromMinor(room) ?? Number.MAX_SAFE_INTEGER;
  return [...detail.roomTypes].sort((a, b) => {
    const fits = Number(b.sleeps >= guests) - Number(a.sleeps >= guests);
    if (fits !== 0) return fits;
    return price(a) - price(b);
  });
}
