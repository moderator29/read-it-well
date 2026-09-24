import { STAYS_DOOR_ORDER } from "@/lib/supply/roles";

/**
 * Where a door goes, in one function, so the chooser and any later caller
 * cannot disagree about it.
 *
 * The answer is carried in the URL for the two property doors that share one
 * form, so the form can branch on it the day the three forms land without the
 * chooser changing.
 */
export function hrefFor(door: string): string {
  /* The door says which side it belongs to; the cookie no longer does (UX-05). */
  if ((STAYS_DOOR_ORDER as readonly string[]).includes(door)) return `/host/apply?door=${door}`;
  if (door === "owner" || door === "agent" || door === "firm") {
    return `/profile/setup/${door}`;
  }
  return "/profile/setup/professional";
}
