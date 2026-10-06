"use client";

import type { ReactNode } from "react";
import { useAuthPath } from "./useAuthPath";
import { useNightDoor } from "@/components/auth/NightDoor";
import { isNightDoorPath } from "@/lib/theme/night-door";
import "@/app/css/auth.css";

/**
 * The auth shell's <main>. On a night door (the sign-up flow, the founder's
 * rule of 30 September 2026) it is a dark island and the document is night
 * while it is on screen; sign in, forgot password and the new password page
 * follow the member's theme. See `lib/theme/night-door.ts`.
 */
export function AuthMain({ children }: { children: ReactNode }) {
  const night = isNightDoorPath(useAuthPath());
  useNightDoor(night);
  return (
    <main id="main" className="nf-auth nf-slate" data-theme={night ? "dark" : undefined}>
      {children}
    </main>
  );
}
