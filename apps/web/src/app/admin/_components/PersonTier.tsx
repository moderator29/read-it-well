import { createElement } from "react";
import { TierBadge } from "@/components/trust/TierBadge";
import type { PersonTier as Tier } from "@/lib/admin/reads/shapes";

/* The one badge beside a name anywhere in the console's shared
   components; the tier is `public.person_badge`, read by `getPersonTiers`.
   Written with createElement rather than JSX so the unit test that renders it
   runs under the test setup's server React build. */
export function PersonTier({ tier, size = "sm" }: { tier: Tier | null | undefined; size?: "sm" | "md" }) {
  if (!tier) return null;
  return createElement(TierBadge, { tier, size: size === "md" ? 16 : 14, className: "nf-admin-name-tier" });
}
