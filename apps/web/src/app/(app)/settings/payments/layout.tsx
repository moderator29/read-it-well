import type { ReactNode } from "react";
import { RouteCopy } from "@/lib/i18n/route-copy";

/**
 * The words this segment's client islands read (the payment methods panel, the bank account sheet, the money lock and Paystack), handed down from
 * the server so none of them imports the dictionary (W13: that import put
 * 398KB gzipped in this route's first load). See `lib/i18n/route-copy.tsx`.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return <RouteCopy keys={["checkout", "success", "moneyLock"]}>{children}</RouteCopy>;
}
