

/**
 * How long a PENDING request holds its nights.
 *
 * This is not a number this file chose. private.release_stale_booking_holds()
 * cancels PENDING bookings older than 48 hours, so the console must say the
 * same 48 hours the database will act on.
 */
export const HOLD_WINDOW_HOURS = 48;

/** A decline has to carry a reason the guest can read. */
export const MIN_DECLINE_REASON_LENGTH = 4;

export const MAX_DECLINE_REASON_LENGTH = 240;

/**
 * Recording what became of a confirmed stay.
 *
 * The note is optional, unlike a decline's reason, and the difference is who
 * reads it. A decline is an answer owed to a guest, so it has a floor. A stay
 * note is the agent's own record, shown to nobody, so requiring one would only
 * teach people to type a full stop.
 */
export const MAX_STAY_NOTE_LENGTH = 500;
