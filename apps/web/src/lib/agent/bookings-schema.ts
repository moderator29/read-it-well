/**
 * bookings-schema: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./bookings-model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

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
import {
  MAX_DECLINE_REASON_LENGTH,
  MAX_STAY_NOTE_LENGTH,
  MIN_DECLINE_REASON_LENGTH,
} from "./bookings-model";
export * from "./bookings-model";

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

export const recordStayInputSchema = z.object({
  bookingId: uuid("We could not identify that booking."),
  outcome: z.enum(["COMPLETED", "NO_SHOW"], {
    message: "A stay either happened or the guest never arrived.",
  }),
  note: z
    .string()
    .trim()
    .max(MAX_STAY_NOTE_LENGTH, `Keep the note to ${MAX_STAY_NOTE_LENGTH} characters or fewer.`)
    .optional(),
});

export type BookingIdInput = z.input<typeof bookingIdSchema>;

export type DeclineInput = z.input<typeof declineInputSchema>;

export type RecordStayInput = z.input<typeof recordStayInputSchema>;
