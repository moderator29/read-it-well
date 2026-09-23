import type { BadgeTier } from "@/lib/admin/reads/badges";

/**
 * WHERE THE BADGE GOES, BESIDE EVERY NAME THESE DESKS DRAW. The tier is read
 * from `public.person_badge` (`getBadgeTiers`, `lib/admin/reads/badges.ts`) and
 * handed here; this never derives one.
 *
 * BLOCKED ON B-BADGE. The artwork and the one component are Session A's
 * (proposed `components/app/badge/PersonBadge.tsx`, `{ tier, size }`), and it
 * had not landed on 23 September. Until it does this renders NOTHING rather
 * than a badge of our own: drawing our own artwork or colours is ruled out.
 * When it lands, this one file returns `<PersonBadge tier={tier} size="sm" />`.
 */
export function BadgeSlot({ tier }: { tier?: BadgeTier | null }): null {
  if (!tier) return null;
  return null;
}
