import { TierBadge } from "@/components/trust/TierBadge";
import type { BadgeTier } from "./belongings";

/* Session A's one badge (`TierBadge`), fed the tier this page read from
   `public.person_badge`. Nothing here decides a tier. Beside the name it is the
   mark alone at the name's size; on the avatar it sits on the ring's upper
   right, clear of the picture control at the lower right. */
export function BadgeSlot({ tier, place }: { tier: BadgeTier; place: "name" | "avatar" }) {
  if (!tier) return null;
  return place === "avatar" ? (
    <TierBadge tier={tier} size={22} decorative className="nf-pf-avatar__tier" />
  ) : (
    <TierBadge tier={tier} size={18} className="nf-pf-name__tier" />
  );
}
