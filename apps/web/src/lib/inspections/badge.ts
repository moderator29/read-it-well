/**
 * THE BADGE TIER, AS READ, NEVER AS DERIVED.
 *
 * Session A owns the badge end to end (scope B-BADGE): the derivation is the
 * view `public.person_badge` (migration 20260923111950), which publishes one
 * row per person with a `tier` of `public.badge_tier` ('none', 'gold',
 * 'platinum'), and an absent row means no badge. This module only narrows
 * what the read returned onto the two tiers that draw a mark. It never
 * computes a tier from anything else; a value it does not recognise is no
 * badge, the failure direction the view's own comment asks for.
 */

export type BadgeTier = "gold" | "platinum";

export function badgeTierFrom(value: unknown): BadgeTier | null {
  return value === "gold" || value === "platinum" ? value : null;
}
