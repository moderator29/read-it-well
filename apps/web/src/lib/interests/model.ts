

export {
  INTEREST_COPY,
  PROPERTY_TYPES,
  isPropertyType,
  knownInterests,
  type PropertyType,
} from "./property-types";

/**
 * The two things somebody can say about a market from a card.
 *
 * Deliberately not a boolean. `more` and `less` are what the buttons say, they
 * are what the confirmation has to name back, and a `{ wanted: true }` payload
 * would have read as "set" rather than "add", which is a different write.
 */
export const INTENT_DIRECTIONS = ["more", "less"] as const;

export type IntentDirection = (typeof INTENT_DIRECTIONS)[number];
