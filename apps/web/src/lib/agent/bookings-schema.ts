import { z } from "zod";

/**
 * Host-side booking input schemas and the one number both halves of the
 * decision surface need.
 *
 * Kept free of any server-only import on purpose, exactly as listings-schema
 * is: the decline sheet runs in the browser and needs the same length bounds
 * the action enforces, so the field cannot promise something the server then
 * refuses. bookings-actions.ts is a "use server" module and may only export
 * async functions, which is the other reason these constants live here.
 */

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

const uuid = (message: string) => z.string().trim().uuid(message);

export const bookingIdSchema = z.object({
  bookingId: uuid("We could not identify that booking."),
});

export const declineInputSchema = z.object({
  bookingId: uuid("We could not identify that booking."),
  reason: z
    .string()
    .trim()
    .min(MIN_DECLINE_REASON_LENGTH, "Tell the guest why, in a short line.")
    .max(
      MAX_DECLINE_REASON_LENGTH,
      `Keep the reason to ${MAX_DECLINE_REASON_LENGTH} characters or fewer.`,
    ),
});

export type BookingIdInput = z.input<typeof bookingIdSchema>;
export type DeclineInput = z.input<typeof declineInputSchema>;
