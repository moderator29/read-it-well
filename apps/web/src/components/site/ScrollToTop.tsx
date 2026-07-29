"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll restoration, the big-app way.
 *
 * Every navigation lands the user at the top of the new page instantly, never
 * part-way down where the previous screen happened to be. Instant, not smooth,
 * so it reads as arriving on a fresh page rather than animating.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
