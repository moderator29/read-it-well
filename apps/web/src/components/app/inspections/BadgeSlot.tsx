import type { BadgeTier } from "@/lib/inspections/badge";

/**
 * WHERE THE PERSON'S BADGE GOES, BESIDE THEIR NAME. BLOCKED ON B-BADGE.
 *
 * The tier is read from `public.person_badge` (lib/inspections/queries.ts)
 * and handed here. The artwork and the one component are Session A's
 * (proposed in scope B-BADGE as a PersonBadge component under
 * components/app/badge, not written yet); it had not landed when
 * this surface closed, so this renders NOTHING rather than drawing a mark of
 * its own. When it lands, this body becomes `<PersonBadge tier={tier} />`
 * and nothing else changes.
 */
export function BadgeSlot({ tier }: { tier: BadgeTier | null | undefined }) {
  void tier;
  return null;
}
