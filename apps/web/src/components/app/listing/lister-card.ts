import type { BadgeTier } from "@/lib/trust/badge-tier";
import type { ListingRole } from "@/lib/supply/roles";

/**
 * THE "LISTED BY" CARD, AS DATA (founder's reference, 13 October 2026).
 *
 * Who put the listing up, as one small record the card draws and nothing
 * else: a name, the handle their profile lives at, a photograph, one role
 * word and the published badge. Every field comes from a row:
 *
 *   name, handle,   `social_profiles` for the lister's supply account
 *   avatar          (`agent_id`), the same public projection their profile
 *                   page reads. A handle nobody has claimed opens nothing.
 *   role            `listings.listing_role` for a firm, otherwise
 *                   `social_profiles.supply_role` (the person's side), with
 *                   the listing's own role as the fallback. Landlord or
 *                   Agent, the words `socialProfile.roleLine` already holds.
 *   tier            `person_badge.tier` through `readPersonBadges`, the one
 *                   door for the badge on every surface. Never invented,
 *                   never on an example listing.
 *
 * No "Online" dot and no rating: Vallo has no presence signal and no rating
 * for a person, so the card draws neither.
 *
 * Pure and in a `.ts` file so it is proved under the unit config.
 */
export type ListerRoleWord = "landlord" | "agent" | "agency";

export type ListerCard = {
  /** Display name, or null when there is none to show. */
  name: string | null;
  /** The claimed handle (`/u/<handle>`), or null: then the person is not a link. */
  handle: string | null;
  /** A public photograph URL, or null for the drawn glyph. */
  avatarUrl: string | null;
  role: ListerRoleWord | null;
  tier: BadgeTier;
};

/** `social_profiles.supply_role`, as the database spells it. */
export type SupplyRole = "owner" | "agent";

/**
 * The one role word. A firm's listing reads Agency whoever posted it; a
 * person reads as their side; the listing's own claim is the fallback.
 */
export function listerRoleWord(
  listingRole: ListingRole | null | undefined,
  supplyRole: SupplyRole | null | undefined,
): ListerRoleWord | null {
  if (listingRole === "firm") return "agency";
  if (supplyRole === "owner") return "landlord";
  if (supplyRole === "agent") return "agent";
  if (listingRole === "owner") return "landlord";
  if (listingRole === "agent") return "agent";
  return null;
}

/** The profile row the card is built from, as the read returns it. */
export type ListerProfileRow = {
  handle: string | null;
  display_label: string | null;
  avatar_path: string | null;
  supply_role: string | null;
  handle_claimed_at: string | null;
};

/**
 * The card, from the listing's facts and the profile row (or none).
 *
 * A FIRM is drawn as the firm: the name `listing_lister` published for it,
 * no personal photograph, no profile link and no personal badge, because the
 * name on the card is not the person the badge or the profile belongs to.
 *
 * An EXAMPLE listing never carries a badge, whatever the row says, for the
 * reason `earned-trust.ts` gives.
 */
export function composeListerCard(input: {
  listingRole: ListingRole | null | undefined;
  listerName: string | null | undefined;
  profile: ListerProfileRow | null;
  tier: BadgeTier;
  isDemo: boolean;
}): ListerCard | null {
  const { listingRole, listerName, profile } = input;
  const supplyRole: SupplyRole | null =
    profile?.supply_role === "owner" || profile?.supply_role === "agent" ? profile.supply_role : null;
  const role = listerRoleWord(listingRole, supplyRole);
  const published = (listerName ?? "").trim() || null;

  if (listingRole === "firm") {
    if (!published) return null;
    return { name: published, handle: null, avatarUrl: null, role, tier: "none" };
  }

  const label = (profile?.display_label ?? "").trim() || null;
  const handle = profile?.handle_claimed_at && (profile.handle ?? "").trim() ? (profile.handle as string).trim() : null;
  const name = label ?? published;
  if (!name && !handle && !role) return null;
  return {
    name,
    handle,
    avatarUrl: (profile?.avatar_path ?? "").trim() || null,
    role,
    tier: input.isDemo || !profile ? "none" : input.tier,
  };
}
