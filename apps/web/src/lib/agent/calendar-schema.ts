/**
 * calendar-schema: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./calendar-model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

import { z } from "zod";
import {
  ISO_DATE_RE,
  MAX_BLOCK_NIGHTS,
  countNights,
  isIsoDate,
} from "./calendar-model";
export * from "./calendar-model";

const isoDate = z
  .string({ message: "Pick a date." })
  .regex(ISO_DATE_RE, "Pick a date.")
  .refine(isIsoDate, "That date does not exist. Pick it again.");

export const blockNightsInputSchema = z
  .object({
    listingId: z.string().min(1, "This listing could not be identified."),
    from: isoDate,
    to: isoDate,
  })
  .superRefine((value, ctx) => {
    if (!isIsoDate(value.from) || !isIsoDate(value.to)) return;
    if (value.to < value.from) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "The last night cannot be before the first.",
      });
      return;
    }
    if (countNights(value.from, value.to) > MAX_BLOCK_NIGHTS) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: `Close up to ${MAX_BLOCK_NIGHTS} nights at a time.`,
      });
    }
  });
