import type { Viewport } from "next";
import type { ReactNode } from "react";
import { NightDoor } from "@/components/auth/NightDoor";
import { CHROME_COLOUR } from "@/lib/theme/chrome";

/**
 * GET STARTED IS ALWAYS DARK (the founder, 30 September 2026: "built on dark
 * mode on default", like the passcode screens). The island, the root and the
 * chrome are `NightDoor`; see `lib/theme/night-door.ts`. The viewport below
 * gives the server's first bytes the night chrome and a dark `color-scheme`,
 * so nothing white shows before the stylesheet or the script has run.
 */
export const viewport: Viewport = {
  themeColor: CHROME_COLOUR,
  colorScheme: "dark",
};

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return <NightDoor>{children}</NightDoor>;
}
