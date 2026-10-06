import type { ReactNode } from "react";
import { RouteCopy } from "@/lib/i18n/route-copy";

/**
 * The words this segment's client islands read (the host wizard, its steps and its payout lock), handed down from
 * the server so none of them imports the dictionary (W13: that import put
 * 398KB gzipped in this route's first load). See `lib/i18n/route-copy.tsx`.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return <RouteCopy keys={["success", "featuresWizard", "moneyLock", "hostWorkspace"]}>{children}</RouteCopy>;
}
