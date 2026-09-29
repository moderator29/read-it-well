import type { ReactNode } from "react";
import { RouteTransition } from "@/components/motion/RouteTransition";

/**
 * Moves BETWEEN the route groups (the landing to sign-in, sign-up to the
 * welcome, sign-in into the app) re-mount this template, so they get the same
 * directional page transition as moves inside a group (motion sweep, 29
 * September 2026). Inside a group this instance stays mounted and the group's
 * own template does the work; React animates only the outermost boundary
 * that enters or leaves, so the two never run twice for one navigation.
 * See `components/motion/RouteTransition.tsx`.
 */
export default function RootTemplate({ children }: { children: ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
