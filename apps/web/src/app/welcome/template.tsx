import type { ReactNode } from "react";
import { RouteTransition } from "@/components/motion/RouteTransition";

/**
 * Get Started's doors open the next screen out of themselves (MOTION_SYSTEM.md
 * section 4, "release into the flow"): the route transition's click listener
 * remembers the tapped door through `lib/motion/nav-origin.ts`, so `/sign-up`
 * grows from the primary and `/sign-in` from the secondary, the same way every
 * auth screen already opens (`(auth)/template.tsx`). Without this template the
 * listener is not installed on `/welcome`, and the first tap in the product
 * was its one plain cut.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
