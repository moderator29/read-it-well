import { describe, expect, it } from "vitest";
import { checkConstraintMessage, NOT_LIVE_MESSAGE, PAST_DATES_MESSAGE } from "./reserve-refusals";

/*
 * ESC-02. `private.price_booking_from_listing` refuses a stay on a listing
 * that is not live and a check-in in the past, both as 23514. Without these
 * two branches the guest was told "something went wrong on our side" about a
 * refusal that is theirs to fix (the dates) or nobody's (the listing).
 */
describe("checkConstraintMessage (ESC-02 refusals)", () => {
  it("names a listing that is not taking bookings", () => {
    expect(
      checkConstraintMessage(
        "booking_listing_not_bookable: this place is not taking stay bookings",
      ),
    ).toBe(NOT_LIVE_MESSAGE);
  });

  it("names a check-in that has passed", () => {
    expect(checkConstraintMessage("booking_check_in_past: check-in has already passed")).toBe(
      PAST_DATES_MESSAGE,
    );
  });

  it("keeps the guest-fixable constraint sentences", () => {
    expect(checkConstraintMessage('violates check constraint "bookings_dates_chk"')).toMatch(
      /Check-out has to be after check-in/,
    );
  });

  it("owns our own arithmetic errors", () => {
    expect(checkConstraintMessage('violates check constraint "bookings_total_chk"')).toMatch(
      /on our side/,
    );
  });
});
