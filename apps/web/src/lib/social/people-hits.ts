import type { PersonRow } from "./people-queries";
import type { BadgeTier } from "../trust/badge-tier";

/**
 * A person found by the search box, as light as the box needs it: who, a face,
 * the word under the name (a landlord or an agent, from the account's own
 * side), the published badge and whether the reader already follows them.
 * Shared by the search action and the people page, which renders the same
 * answer on the server for an address that carries `?q=`.
 *
 * Not a server-action module: a `"use server"` file may export only async
 * functions, and this holds a type and a pure mapper.
 */
export type PersonHit = {
  handle: string;
  displayLabel: string;
  avatarUrl: string;
  isAgent: boolean;
  /** Landlord or agent, from `social_profiles.supply_role`; null for a plain member. */
  role: "landlord" | "agent" | null;
  /** The published badge (`person_badge`); never inferred from a role. */
  tier: BadgeTier;
  viewerFollows: boolean;
  isViewer: boolean;
};

export function hitsOf(
  people: readonly Pick<
    PersonRow,
    "handle" | "displayLabel" | "avatarUrl" | "isAgent" | "supplyRole" | "badgeTier" | "viewerFollows" | "isViewer"
  >[],
  limit: number,
): PersonHit[] {
  return people.slice(0, limit).map((p) => ({
    handle: p.handle,
    displayLabel: p.displayLabel,
    avatarUrl: p.avatarUrl,
    isAgent: p.isAgent,
    role: p.isAgent || p.supplyRole ? (p.supplyRole === "owner" ? "landlord" : "agent") : null,
    tier: p.badgeTier,
    viewerFollows: p.viewerFollows,
    isViewer: p.isViewer,
  }));
}
