/**
 * NIGHTLY INVENTORY: the rows without which a hotel cannot be found.
 *
 * WHAT WAS TRUE BEFORE THIS FILE. `public.room_inventory` was created in M5
 * with its oversell lock, its two triggers and its RLS, and **no application
 * file ever wrote a row**: the only two mentions of the table anywhere in
 * `apps/web/src` were comments. `stays_search` treats a missing row as NOT
 * OFFERED rather than as available, deliberately and correctly, so a hotel
 * with no inventory rows is invisible to every search that carries dates. A
 * host could pass every gate, reach the shelf, and still never be found by
 * anybody who typed the nights they wanted.
 *
 * WHAT A ROW MEANS, AND WHY THIS IS NOT AN INVENTED NUMBER. `units_open` is
 * how many of that room type are on sale that night. It is opened at the
 * host's OWN declared `units_total`, which is the answer they typed to "how
 * many of this room" in their application, and at nothing else. The platform
 * never decides how many rooms a hotel has; it writes down the number the host
 * gave and tells them it has done so. `units_booked` is not written here and
 * cannot be: a trigger refuses any change to that column from outside
 * `private.reserve_room_nights`.
 *
 * WHY A HORIZON RATHER THAN FOREVER. A row per room type per night is the
 * model, so "for ever" is not available; something has to say how far ahead
 * the hotel is taking bookings. A year is the industry's own answer and it is
 * the number a Nigerian hotel quotes for a wedding block. Nothing here rolls
 * it forward, and that is stated rather than hidden: see `HORIZON_NOTE`, which
 * is the sentence shown to the host, and the ledger entry beside it.
 *
 * The date arithmetic is UTC throughout, because `room_inventory.date` is a
 * `date` and a local-midnight Date in Lagos (UTC+1) renders as the previous
 * day in ISO. That is the commonest way a calendar loses its first night.
 */

/** How many nights ahead a newly published room type is offered. */
export const INVENTORY_HORIZON_NIGHTS = 365;

/** What the host is told, in the words the surface uses. */
export const HORIZON_NOTE =
  "Every room you told us about is offered on every night for the next year. Close the nights you are not taking, and open more when you are.";

/** A night on sale: the shape `room_inventory` takes on insert. */
export type InventoryNight = {
  room_type_id: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  units_open: number;
};

/** One day in ISO, from a UTC instant. */
export function isoDate(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/**
 * The nights to open for one room type, starting on `from` inclusive.
 *
 * Returns nothing when the room type offers nothing, because a row with
 * `units_open` of zero is a blackout the host did not ask for and a row that
 * says nothing is available is worse than no row at all: the first is a
 * decision, the second is silence, and a room type with no units is silence.
 */
export function nightsToOpen(
  roomTypeId: string,
  unitsTotal: number,
  from: Date,
  nights: number = INVENTORY_HORIZON_NIGHTS,
): InventoryNight[] {
  if (unitsTotal <= 0 || nights <= 0) return [];
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const out: InventoryNight[] = [];
  for (let day = 0; day < nights; day += 1) {
    out.push({
      room_type_id: roomTypeId,
      date: isoDate(new Date(start + day * 86_400_000)),
      units_open: unitsTotal,
    });
  }
  return out;
}

/** Every night in a closed range, inclusive at both ends. Empty when reversed. */
export function nightsBetween(from: string, to: string): string[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const out: string[] = [];
  for (let at = start; at <= end; at += 86_400_000) out.push(isoDate(new Date(at)));
  return out;
}

/**
 * The most nights a host may set in one act.
 *
 * Not a product rule, a size rule: one upsert carries one request body, and a
 * host who typed 2035 into a date field should be told the range is too long
 * rather than have the browser post a hundred thousand rows and time out.
 */
export const MAX_NIGHTS_IN_ONE_ACT = 400;
