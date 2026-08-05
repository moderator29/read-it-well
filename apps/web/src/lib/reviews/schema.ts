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

export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** The longest review body we accept. Long enough for a real account of a stay. */
export const BODY_MAX = 1200;

/**
 * What each star actually means, so the rating is a judgement rather than a
 * number the guest has to invent a meaning for.
 */
export const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Disappointing",
  3: "Fine",
  4: "Good",
  5: "Excellent",
};

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
