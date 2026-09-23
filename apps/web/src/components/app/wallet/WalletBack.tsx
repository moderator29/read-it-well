"use client";

import { usePathname } from "next/navigation";
import { BackButton } from "@/components/site/BackButton";
import { parentOf } from "@/lib/nav/resolve";

/**
 * The way back on the money pages.
 *
 * `/wallet` and `/wallet/send` declare a parent in `lib/nav/route-parents.ts`
 * (`/home` and `/wallet`) and drew no back control, so on Android the
 * hardware back had nothing to answer to and closed the app. This mounts the
 * platform's one `BackButton`, which goes to the DECLARED parent however the
 * person arrived, the same way `app/(site)/SiteBackBar.tsx` does, and draws
 * nothing on a route with no declared parent or on a root.
 *
 * Placed where both renders put their back square: the top left, above the
 * balance card. Styled as the render's glass square (`nf-wallet-back` in
 * wallet.css): 37px in the render, 44px here (R-B).
 */
export function WalletBack() {
  const pathname = usePathname();
  const target = parentOf(pathname ?? "/wallet");
  if (target.kind !== "parent") return null;
  return (
    <div className="nf-wallet-backrow">
      <BackButton fallback={target.href} className="nf-wallet-back" />
    </div>
  );
}
