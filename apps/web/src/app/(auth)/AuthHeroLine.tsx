"use client";

import { useAuthPath } from "./useAuthPath";

/**
 * The line under the wordmark in the curved top block, chosen by the screen.
 *
 * The block is drawn once by the auth layout, so it cannot be told which page
 * is inside it; the path can. Every sentence arrives as a prop from the
 * server's dictionary, so nothing English lives here.
 */
export function AuthHeroLine({
  lines,
}: {
  lines: { signIn: string; signUp: string; verify: string; reset: string };
}) {
  const path = useAuthPath();
  if (path.startsWith("/sign-up/verify")) return <>{lines.verify}</>;
  if (path.startsWith("/sign-up")) return <>{lines.signUp}</>;
  if (path.startsWith("/forgot-password") || path.startsWith("/reset-password")) {
    return <>{lines.reset}</>;
  }
  return <>{lines.signIn}</>;
}
