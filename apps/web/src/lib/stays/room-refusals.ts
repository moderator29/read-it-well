/**
 * ROOM BOOKINGS 1: what the database says when it refuses a room, in words.
 *
 * The refusals come from `private.price_room_booking` (the price, the place,
 * the limits) and `private.reserve_room_nights` (the rooms themselves). Every
 * one of them means nothing was held and nothing was charged, so every
 * sentence says what the guest can do next.
 */
export const ROOMS_OFF_MESSAGE =
  "Rooms at this hotel cannot be booked on Vallo yet. Nothing was held and nothing was charged.";
export const ROOM_NOT_BOOKABLE_MESSAGE =
  "This room is not taking bookings right now. Try another room or another hotel.";
export const ROOM_OWN_PLACE_MESSAGE = "This is your own place, so you cannot book a room at it.";
export const ROOM_SOLD_OUT_MESSAGE =
  "There are not enough of these rooms free on those nights. Try other dates or fewer rooms.";
export const ROOM_CLOSED_NIGHTS_MESSAGE =
  "The hotel has closed some of those nights. Pick other dates.";
export const ROOM_STAY_LENGTH_MESSAGE =
  "This rate does not sell a stay of that length. Pick more or fewer nights, or another rate.";
export const ROOM_PAST_MESSAGE = "Check-in has already passed. Pick dates from today onwards.";
export const ROOM_TOO_LONG_MESSAGE = "A stay can be at most 90 nights.";
export const ROOM_HOLD_LIMIT_MESSAGE =
  "You already have unconfirmed stays waiting, including one at this hotel or three in all. Cancel one from Trips, then ask for this room.";
export const ROOM_RATE_LIMIT_MESSAGE =
  "You have made a lot of bookings in a short time. Try again tomorrow.";
export const ROOM_GENERIC_MESSAGE =
  "We could not ask for this room just now. Nothing was held and nothing was charged. Try again in a moment.";

/** The sentence for a refused room request, from the database error it raised. */
export function roomRefusalMessage(error: { code?: string | null; message?: string | null } | null): string {
  const message = error?.message ?? "";
  if (message.includes("room_bookings_off")) return ROOMS_OFF_MESSAGE;
  if (message.includes("room_own_venue")) return ROOM_OWN_PLACE_MESSAGE;
  if (message.includes("room_not_bookable") || message.includes("room_booking_mismatch")) return ROOM_NOT_BOOKABLE_MESSAGE;
  if (message.includes("room_count")) return ROOM_SOLD_OUT_MESSAGE;
  if (message.includes("booking_dates_blocked") || message.includes("closed")) return ROOM_CLOSED_NIGHTS_MESSAGE;
  if (message.includes("booking_check_in_past")) return ROOM_PAST_MESSAGE;
  if (message.includes("booking_too_long")) return ROOM_TOO_LONG_MESSAGE;
  if (message.includes("booking_hold_limit")) return ROOM_HOLD_LIMIT_MESSAGE;
  if (message.includes("booking_rate_limit")) return ROOM_RATE_LIMIT_MESSAGE;
  /* reserve_room_nights: the counted update found fewer free nights than asked. */
  if (/^Only \d+ of \d+ night/.test(message)) return ROOM_SOLD_OUT_MESSAGE;
  if (/at least \d+ night|at most \d+ night|admits a stay/.test(message)) return ROOM_STAY_LENGTH_MESSAGE;
  if (message.includes("not on sale") || message.includes("no longer exists")) return ROOM_NOT_BOOKABLE_MESSAGE;
  return ROOM_GENERIC_MESSAGE;
}
