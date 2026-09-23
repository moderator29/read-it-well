/* ESC-02. The database prices every stay from the listing and takes none
   against a listing that is not live, so this is the sentence for that. */
export const NOT_LIVE_MESSAGE =
  "This place is not taking bookings right now. Explore other stays from search.";

export const PAST_DATES_MESSAGE = "Check-in has already passed. Pick dates from today onwards.";

/**
 * Turn a 23514 check-constraint violation into the true sentence.
 *
 * Eleven check constraints on public.bookings can raise this code and only
 * three of them are ever the guest's doing. Saying "those dates do not work"
 * for all of them tells a guest to go and fix dates that are perfectly fine,
 * and hides an arithmetic bug of ours behind their supposed mistake.
 *
 * The guest-fixable ones name the fix. Everything else is our error, so it says
 * so and does not send them back to the form to guess.
 */
export function checkConstraintMessage(message: string): string {
  /* ESC-02: the two refusals `private.price_booking_from_listing` raises. */
  if (message.includes("booking_listing_not_bookable")) return NOT_LIVE_MESSAGE;
  if (message.includes("booking_check_in_past")) return PAST_DATES_MESSAGE;
  if (message.includes("bookings_dates_chk")) {
    return "Check-out has to be after check-in. Pick the dates again.";
  }
  if (message.includes("bookings_adults_check")) {
    return "A booking needs at least one adult on it.";
  }
  if (message.includes("bookings_children_check")) {
    return "The number of children cannot be negative.";
  }
  /* bookings_nights_chk, bookings_subtotal_chk, bookings_total_chk and the
     non-negative money checks are all arithmetic this server did. A guest can
     do nothing about any of them, so we do not pretend otherwise. */
  return "Something went wrong working out this booking on our side. Nothing was charged and nothing was held. Please try again, and tell support if it happens twice.";
}

