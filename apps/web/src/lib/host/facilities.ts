/**
 * WHAT A STAY OFFERS, AND THE TABLE NOBODY EVER WROTE TO.
 *
 * `public.accommodation_amenities` was created in M3 with its owner helper and
 * its RLS. The stay detail page reads it (`lib/stays/queries.ts`), the
 * catalogue projection folds it into `catalogue_entries.amenity_codes`, and the
 * stays filter lets a guest ask for `wifi`, `parking` and `ac` by name and for
 * any list of amenity codes besides. **No application code ever wrote a row.**
 * So every facility filter on the stays shelf returned nothing for every hotel
 * on the platform, and no stay's page has ever named a single facility. The
 * same shape of defect as the photographs, the room types and the nights, and
 * the fourth one of its family.
 *
 * WHY A LIST HERE RATHER THAN THE WHOLE TABLE. `public.amenities` is shared
 * with the property side and carries codes a flat has and a hotel does not,
 * and the other way about. Offering a hotel every row would put "Furnished" on
 * a hotel's facilities screen, which means nothing there. This is the subset a
 * stay can honestly claim, in the order `GOVERNING-10` screen four groups
 * them, and each entry is a code that EXISTS in `public.amenities` today. A
 * facility the database cannot store is not offered, because that is exactly
 * the defect the property wizard shipped with: three codes in the interface
 * and none of them in the table.
 *
 * TWO TILES OF THE GOVERNING IMAGE ARE NOT HERE AND THAT IS DELIBERATE.
 * `GOVERNING-10` draws "Restaurant" and "Airport shuttle" and neither has a
 * row in `public.amenities`. Adding them is a seed migration on a table the
 * property side also reads, so it is raised in the ledger rather than taken
 * unilaterally, and until it lands those two are absent rather than drawn as
 * controls that would silently save nothing.
 */

import type { UiIconName } from "@/design-system/icons/UiIcon";

export type StayFacility = {
  /** The `amenities.code`, exactly. */
  code: string;
  /** What a host calls it. The database label is written for both sides. */
  label: string;
  mark: UiIconName;
};

/**
 * The facilities a stay may claim, grouped as the render groups them: the
 * things a guest chooses a hotel for first, then the building, then the room.
 */
export const STAY_FACILITIES: readonly StayFacility[] = [
  { code: "pool", label: "Swimming pool", mark: "pool" },
  { code: "gym", label: "Gym", mark: "bolt" },
  { code: "parking", label: "Parking", mark: "parking" },
  { code: "generator", label: "Backup power", mark: "bolt" },
  { code: "wifi", label: "WiFi", mark: "wifi" },
  { code: "ac", label: "Air conditioning", mark: "sparkle" },
  { code: "security", label: "Security", mark: "shield-stop" },
  { code: "elevator", label: "Lift", mark: "arrow-up" },
  { code: "laundry", label: "Laundry", mark: "sparkle" },
  { code: "breakfast", label: "Breakfast", mark: "utensils" },
  { code: "workspace", label: "Workspace", mark: "document" },
  { code: "kitchen", label: "Kitchen", mark: "kitchen" },
  { code: "tv", label: "TV", mark: "views" },
  { code: "shower", label: "Hot shower", mark: "bath" },
  { code: "water", label: "Running water", mark: "bath" },
] as const;

/** Every code this surface may send, so the server can refuse anything else. */
export const STAY_FACILITY_CODES: readonly string[] = STAY_FACILITIES.map(
  (facility) => facility.code,
);

/**
 * The codes of a chosen set, in the list's own order and with anything unknown
 * dropped.
 *
 * The order matters because it is what a guest reads on the stay's page, and
 * an order that follows what people care about beats an order that follows
 * what somebody happened to tap first.
 */
export function orderFacilities(codes: readonly string[]): string[] {
  const chosen = new Set(codes);
  return STAY_FACILITIES.filter((facility) => chosen.has(facility.code)).map(
    (facility) => facility.code,
  );
}
