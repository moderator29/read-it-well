import { z } from "zod";
import { PROPERTY_TYPES } from "./property-types";

export {
  INTEREST_COPY,
  PROPERTY_TYPES,
  isPropertyType,
  knownInterests,
  type PropertyType,
} from "./property-types";

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
 * The two things somebody can say about a market from a card.
 *
 * Deliberately not a boolean. `more` and `less` are what the buttons say, they
 * are what the confirmation has to name back, and a `{ wanted: true }` payload
 * would have read as "set" rather than "add", which is a different write.
 */
export const INTENT_DIRECTIONS = ["more", "less"] as const;
export type IntentDirection = (typeof INTENT_DIRECTIONS)[number];

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
