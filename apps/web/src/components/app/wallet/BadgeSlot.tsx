import { TierBadge } from "@/components/trust/TierBadge";

export type BadgeTier = "gold" | "platinum" | null;

/* Session A's one badge beside the resolved recipient; the tier comes from
   `public.person_badge` through the send name check. */
export function BadgeSlot({ tier }: { tier: BadgeTier }) {
  if (!tier) return null;
  return <TierBadge tier={tier} size={16} className="nf-send-name-tier" />;
}
