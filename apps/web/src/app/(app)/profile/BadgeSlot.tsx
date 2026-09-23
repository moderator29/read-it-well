import type { BadgeTier } from "./belongings";

/**
 * WHERE THE PERSON'S BADGE GOES, AND WHY IT DRAWS NOTHING TODAY.
 *
 * The badge is Session A's end to end (scope B-BADGE): the tier is derived once,
 * in `public.person_badge` (platinum for platform staff, gold for a person Vallo
 * checked), and drawn by one component, which Session A proposes as PersonBadge
 * in the app badge folder (not yet in the tree). The profile reads the tier from that
 * view (`loadOwnBadgeTier`) and hands it here, beside the name and on the
 * avatar. Until Session A's component lands this renders NOTHING: no artwork
 * and no colour of the profile's own, and no tier derived here. The day the
 * component exists, this is one line:
 *
 *   return tier ? <PersonBadge tier={tier} size={size} /> : null;
 *
 * Blocked on B-BADGE, recorded in the ledger.
 */
export function BadgeSlot({ tier }: { tier: BadgeTier; place: "name" | "avatar" }) {
  void tier;
  return null;
}
