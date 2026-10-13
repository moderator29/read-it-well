/**
 * schema: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

import { z } from "zod";

/**
 * Review input, and the constants both the form and the action share.
 *
 * Client-safe on purpose: this module imports nothing server-only, so the
 * review form can import the rating labels and the body limit without dragging
 * a server module into the browser bundle. A client component importing a value
 * from a server-only module typechecks cleanly and fails the build, which is
 * exactly the trap this split exists to avoid.
 */
import {
  BODY_MAX,
  RATING_MAX,
  RATING_MIN,
} from "./model";
export * from "./model";

export const reviewInputSchema = z.object({
  bookingId: z.string().min(1, "This stay could not be identified."),
  rating: z.coerce
    .number({ message: "Choose a rating from one to five stars." })
    .int("Choose a rating from one to five stars.")
    .min(RATING_MIN, "Choose a rating from one to five stars.")
    .max(RATING_MAX, "Choose a rating from one to five stars."),
  body: z
    .string()
    .trim()
    .max(BODY_MAX, `Keep your review under ${BODY_MAX} characters.`)
    .optional(),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
