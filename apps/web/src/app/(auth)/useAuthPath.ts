"use client";

import { usePathname } from "next/navigation";
import { splitLocalePrefix } from "@/lib/i18n/public-locale";

/**
 * THE AUTH SCREEN'S OWN PATH, WITHOUT THE LANGUAGE (U1, 6 October).
 *
 * A reader in Hausa, Igbo or Yoruba is served the auth screens under their
 * language's prefix (`/yo/sign-up/verify`), and `usePathname` returns that
 * address. The bowl's picture, its line, the object, the way back and the
 * sign-up flow's night door all read the path, and every one of them was
 * matching on `/sign-up` and so missing on `/yo/sign-up`: measured in a
 * production build, the Yoruba code screen said "Welcome back! Sign in to
 * continue." over the sign-in tower, with no way back, and the sign-up flow
 * was not a night door. They read this instead.
 */
export function useAuthPath(): string {
  return splitLocalePrefix(usePathname() ?? "/").path;
}
