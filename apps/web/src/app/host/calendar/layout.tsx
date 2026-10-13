import type { ReactNode } from "react";
import { RouteCopy } from "@/lib/i18n/route-copy";

/**
 * The words this segment's client islands read (`experienceHost`, through
 * `useHostPageCopy`: the rate calendar, its panel, its sync and its rate
 * sheet), handed down from the server so none of them imports the dictionary.
 * See `lib/i18n/route-copy.tsx`.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return <RouteCopy keys={["experienceHost"]}>{children}</RouteCopy>;
}
