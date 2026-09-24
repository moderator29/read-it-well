import type { Dictionary } from "@vallo/i18n";

/**
 * The supply side's front door, for a signed-in member who has no listing
 * workspace yet.
 *
 * Every `/agent` route is behind the sign-in gate, so whoever reaches one
 * without an agent profile IS signed in. The identity card used to answer
 * "Not signed in as an agent — Sign in" and link to /sign-in, and the pitch,
 * dashboard and inspections screens sent everybody to the owner form whatever
 * they were (UX-11, SUP-15). The door is the workspace chooser, which offers
 * owner, agent and firm.
 */
export const SUPPLY_DOOR_HREF = "/profile/setup";

export type NoWorkspaceDoor = { label: string; cta: string; href: string };

export function noWorkspaceDoor(mode: Dictionary["agent"]["mode"]): NoWorkspaceDoor {
  return { label: mode.noWorkspace, cta: mode.applyToList, href: SUPPLY_DOOR_HREF };
}
