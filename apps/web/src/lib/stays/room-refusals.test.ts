import { describe, expect, it } from "vitest";
import {
  ROOMS_OFF_MESSAGE,
  ROOM_CLOSED_NIGHTS_MESSAGE,
  ROOM_GENERIC_MESSAGE,
  ROOM_HOLD_LIMIT_MESSAGE,
  ROOM_NOT_BOOKABLE_MESSAGE,
  ROOM_OWN_PLACE_MESSAGE,
  ROOM_SOLD_OUT_MESSAGE,
  ROOM_STAY_LENGTH_MESSAGE,
  roomRefusalMessage,
} from "./room-refusals";

/* The refusals the database raises (price_room_booking, reserve_room_nights), in words. */
describe("roomRefusalMessage", () => {
  const cases: [string, string][] = [
    ["room_bookings_off: hotel rooms cannot be booked on Vallo yet", ROOMS_OFF_MESSAGE],
    ["room_own_venue: you cannot book a room at your own place", ROOM_OWN_PLACE_MESSAGE],
    ["room_not_bookable: this room is not taking bookings", ROOM_NOT_BOOKABLE_MESSAGE],
    ["room_booking_mismatch: that room and rate are not sold at this place", ROOM_NOT_BOOKABLE_MESSAGE],
    ["room_count: this place has 2 room(s) of this type", ROOM_SOLD_OUT_MESSAGE],
    ["booking_dates_blocked: the host has closed some of these nights", ROOM_CLOSED_NIGHTS_MESSAGE],
    ["This rate is closed on one of those nights.", ROOM_CLOSED_NIGHTS_MESSAGE],
    ["booking_hold_limit: too many unconfirmed stays are already held", ROOM_HOLD_LIMIT_MESSAGE],
    ["Only 2 of 3 night(s) had 1 room(s) free. Nothing was held.", ROOM_SOLD_OUT_MESSAGE],
    ["This rate needs a stay of at least 2 night(s).", ROOM_STAY_LENGTH_MESSAGE],
    ["No rate on this room admits a stay of 30 night(s).", ROOM_STAY_LENGTH_MESSAGE],
    ["That rate plan is not on sale.", ROOM_NOT_BOOKABLE_MESSAGE],
  ];
  for (const [raised, said] of cases) {
    it(`says the true thing for "${raised.slice(0, 40)}"`, () => {
      expect(roomRefusalMessage({ message: raised })).toBe(said);
    });
  }
  it("never guesses: anything else is ours, and says nothing was held or charged", () => {
    expect(roomRefusalMessage({ message: "connection reset" })).toBe(ROOM_GENERIC_MESSAGE);
    expect(roomRefusalMessage(null)).toBe(ROOM_GENERIC_MESSAGE);
    expect(ROOM_GENERIC_MESSAGE).toMatch(/Nothing was held and nothing was charged/);
  });
});
