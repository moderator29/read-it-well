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
import { PROPERTY_TYPES } from "./property-types";
import {
  INTENT_DIRECTIONS,
} from "./model";
export * from "./model";

/**
 * What a client may send.
 *
 * Unknown values are REJECTED rather than dropped. Silently discarding a value
 * the server did not recognise would let a stale client save half a choice and
 * be told it worked, and the person would never learn which half. Duplicates
 * are collapsed, because choosing the same card twice is not two answers, and
 * order is not meaningful so it is not preserved as sent.
 *
 * The list may be empty. Empty is a real answer: it is what skipping stores,
 * and what taking every card back off means.
 */
export const saveInterestsSchema = z.object({
  interests: z
    .array(
      z.enum(PROPERTY_TYPES, {
        message: "That is not something we list. Choose from the cards on this screen.",
      }),
      { message: "Choose from the cards on this screen." },
    )
    .max(
      PROPERTY_TYPES.length,
      "That is more choices than there are cards. Choose from the cards on this screen.",
    )
    .transform((values) => [...new Set(values)]),
});

export type SaveInterestsInput = z.input<typeof saveInterestsSchema>;

export type SaveInterestsValues = z.output<typeof saveInterestsSchema>;

/**
 * One market, adjusted in one direction.
 *
 * The same vocabulary as `saveInterestsSchema` and deliberately no second one:
 * a card writes into `profiles.interests` exactly as the welcome screen does,
 * so there is one stored answer and one taxonomy behind both. What differs is
 * only the shape of the request - a whole list there, a single nudge here -
 * because a card cannot know, and must not overwrite, the other eight answers.
 */
export const adjustInterestSchema = z.object({
  type: z.enum(PROPERTY_TYPES, {
    message: "That is not something we list.",
  }),
  direction: z.enum(INTENT_DIRECTIONS, {
    message: "That is not something this control can do.",
  }),
});

export type AdjustInterestInput = z.input<typeof adjustInterestSchema>;
