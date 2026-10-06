import type { ReactNode } from "react";
import { RouteCopy } from "@/lib/i18n/route-copy";
import { NairaFacePreload } from "@/components/app/NairaFacePreload";

/**
 * The words this page's client islands read (the live crypto payment status
 * and its success moment), handed down from the server so none of them needs
 * to import the dictionary (W13: that import put 398KB gzipped in this
 * route's first load). See `lib/i18n/route-copy.tsx`.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* A money screen: the naira sign's face arrives with the page. */}
      <NairaFacePreload />
      <RouteCopy keys={["cryptoPay", "success"]}>{children}</RouteCopy>
    </>
  );
}
