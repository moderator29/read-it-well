import { z } from "zod";
import { Constants } from "../supabase/database.types";
import type { Database } from "../supabase/database.types";

/**
 * What a person may say they came here for.
 *
 * The vocabulary is `public.property_type`, the enum the catalogue is already
 * filed under and the one `/search?type=` already filters on. There is
 * deliberately no second "interests" taxonomy: a parallel list would need a
 * mapping to this one forever, and a mapping nobody owns is how two vocabularies
 * drift apart until the stated intent stops meaning anything the catalogue can
 * answer.
 *
 * `Constants` is generated from the database, so this list cannot fall behind
 * the enum: add a value in Postgres, regenerate, and the option appears here,
 * in the validator and on the screen at once. The only thing hand-written is
 * the label, because a database value is not a sentence.
 */

export type PropertyType = Database["public"]["Enums"]["property_type"];

/** Every value the enum holds, straight from the generated constants. */
export const PROPERTY_TYPES = Constants.public.Enums.property_type;

/**
 * How each value is said out loud, and the one line under it.
 *
 * Plural, because the person is choosing a market to be shown, not a single
 * place. The sub-line exists because "rental" and "shortlet" are not the same
 * thing to somebody arriving for the first time, and neither is "apartment"
 * versus "home". Every line here describes what the platform actually lists.
 */
export const INTEREST_COPY: Record<PropertyType, { label: string; hint: string }> = {
  apartment: { label: "Apartments", hint: "Nightly stays in a flat" },
  hotel: { label: "Hotels", hint: "Rooms, booked by the night" },
  home: { label: "Homes", hint: "A whole house for your stay" },
  villa: { label: "Villas", hint: "Larger private places" },
  shortlet: { label: "Shortlets", hint: "A few nights to a few weeks" },
  rental: { label: "Rentals", hint: "Somewhere to live, by the year" },
  shop: { label: "Shops", hint: "Retail space, by the year" },
  office: { label: "Offices", hint: "Workspace, by the year" },
  land: { label: "Land", hint: "Plots to buy or lease" },
};

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
 * Read a stored array back into known values.
 *
 * A column can hold a value this build has never heard of - an enum widened by
 * a migration that shipped ahead of the app - so reads are filtered rather than
 * trusted. An unknown value is ignored, never rendered as a blank card.
 */
export function knownInterests(raw: readonly string[] | null | undefined): PropertyType[] {
  if (!raw) return [];
  const known = new Set<string>(PROPERTY_TYPES);
  return raw.filter((value): value is PropertyType => known.has(value));
}

/**
 * Is this string one of the markets we file the catalogue under?
 *
 * A discovery result is a `ListingKind`, which is `property_type` PLUS
 * `restaurant` and `experience` - two things the catalogue lists but nobody can
 * state an interest in, because the column that stores the answer is a
 * `property_type[]` and would refuse them. The per-card control asks this
 * before it renders, so a restaurant card carries no control at all rather than
 * one that fails on the server. Widening `property_type` in Postgres and
 * regenerating is all it would take for that to change; nothing here is
 * hand-listed.
 */
export function isPropertyType(value: string): value is PropertyType {
  return (PROPERTY_TYPES as readonly string[]).includes(value);
}

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
