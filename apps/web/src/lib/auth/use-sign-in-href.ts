"use client";

import { usePathname } from "next/navigation";
import { withNext } from "./next-link";

/**
 * The sign-in address that brings a person back to the screen they are on.
 *
 * For a client control that sends a signed-out person to sign in (a like, a
 * comment, a report, a story) where the screen has no id in hand to build the
 * return from. Sign-in reads only `next`, so a bare `/sign-in` lands them on
 * the home shelf with no way back to what they were doing (A9). Outside the
 * app router the path is unknown and this is the plain door.
 */
export function useSignInHref(): string {
  return withNext("/sign-in", usePathname());
}
