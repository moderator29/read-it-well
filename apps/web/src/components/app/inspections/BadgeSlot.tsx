import { TierBadge } from "@/components/trust/TierBadge";
import type { BadgeTier } from "@/lib/inspections/badge";

/* Session A's one badge beside the other person's name; the tier comes from
   `public.person_badge` through the inspection reads. */
export function BadgeSlot({ tier }: { tier: BadgeTier | null | undefined }) {
  if (!tier) return null;
  return <TierBadge tier={tier} size={14} className="nf-ix-name-tier" />;
}
