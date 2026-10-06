import type { PropertyType } from "@/lib/interests/property-types";

/*
 * The space types the Property home offers, and the order they are offered in
 * once somebody has said what they came for (`SpaceTypeRow.tsx`, the home
 * page's shelf). Pure and in a `.ts` so the suite can hold the order without
 * rendering anything. Session 3, W2.
 */

/** The Property side's types, in the order a renter meets them. */
export const PROPERTY_SPACE_TYPES = ["rental", "apartment", "home", "villa", "land", "shop", "office"] as const satisfies readonly PropertyType[];

export type SpaceTypeKey = (typeof PROPERTY_SPACE_TYPES)[number];

/** The stated types first, then the rest, each group in the row's own order. */
export function orderSpaceTypes(interests: readonly PropertyType[]): { type: SpaceTypeKey; mine: boolean }[] {
  const mine = PROPERTY_SPACE_TYPES.filter((type) => interests.includes(type));
  const rest = PROPERTY_SPACE_TYPES.filter((type) => !interests.includes(type));
  return [...mine.map((type) => ({ type, mine: true })), ...rest.map((type) => ({ type, mine: false }))];
}

