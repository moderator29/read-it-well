import { TierBadge } from "@/components/trust/TierBadge";
import type { BadgeTier } from "@/lib/admin/reads/badges";

/* Session A's one badge beside a name on the money desks; the tier is the
   published `public.person_badge` value read by `getBadgeTiers`. */
export function BadgeSlot({ tier }: { tier?: BadgeTier | null }) {
  if (!tier) return null;
  return <TierBadge tier={tier} size={14} className="nf-admin-name-tier" />;
}
