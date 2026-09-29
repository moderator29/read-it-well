/*
 * THE BOUNDS WITHOUT THE VALIDATOR. `ReserveTable` (a client component on the
 * listing, stay and restaurant pages) imported `MAX_PARTY` from `schema.ts`,
 * which put the whole of zod, about 62 KB gzipped, into those pages' first
 * load for one number. The numbers live here and `schema.ts` re-exports them.
 * The same split as `lib/interests/property-types.ts` from its `schema.ts`.
 */

/** Above this a table is an event, and the answer is a conversation. */
export const MAX_PARTY = 50;

/** How far ahead a table may be held. Beyond this nobody knows their plans. */
export const MAX_DAYS_AHEAD = 90;
