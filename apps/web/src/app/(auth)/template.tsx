import type { ReactNode } from "react";
import { RouteTransition } from "@/components/motion/RouteTransition";

/**
 * Re-mounted on every navigation between this group's pages, which is what
 * lets the page enter and leave with a direction (motion sweep, 29 September
 * 2026). See `components/motion/RouteTransition.tsx`.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
