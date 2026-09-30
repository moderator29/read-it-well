import type { Viewport } from "next";
import type { ReactNode } from "react";
import { CHROME_COLOUR } from "@/lib/theme/chrome";

/**
 * THE SIGN-UP FLOW IS ALWAYS DARK (the founder, 30 September 2026), from the
 * form through its code step to the finish. The island and the root are the
 * auth shell's (`../AuthMain.tsx`); this gives the server's first bytes the
 * night chrome and a dark `color-scheme`. See `lib/theme/night-door.ts`.
 */
export const viewport: Viewport = {
  themeColor: CHROME_COLOUR,
  colorScheme: "dark",
};

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}
