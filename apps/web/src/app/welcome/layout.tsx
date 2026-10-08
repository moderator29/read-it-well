import type { ReactNode } from "react";

/**
 * GET STARTED FOLLOWS THE READER'S THEME (7 October 2026). It was a night
 * door, dark whatever the reader chose (30 September); now that it is the one
 * onboarding every way in reaches, it reads like the rest of the product:
 * dark by default, light for a reader who chose light. The root layout's
 * viewport and before-paint script already give the chrome and the canvas
 * the right theme, so this layout adds nothing but the boundary.
 */
export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return children;
}
