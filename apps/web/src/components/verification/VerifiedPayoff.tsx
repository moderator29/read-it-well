"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import "./verified-payoff.css";
import { markSeen, seenOnce } from "@/lib/ui/seen-once";
import { hapticOnPop } from "./payoff-haptic";
import { VPASS_COOKIE, VPASS_COOKIE_MAX_AGE_S, vpassKeys } from "./payoff-seen";

/**
 * THE VERIFICATION-PASSED PAYOFF (MOTION_SYSTEM "Verification passed: shield
 * assembles, tick embosses, pop"; principle 5, the one pop; round 5, the
 * "something is verified" moment).
 *
 * RENDERED ONLY WHEN THE SERVER SAYS SO. The page wraps the approved plate in
 * this only when a rung really passed recently (`approvedRecently`) and this
 * device's cookie does not already name the level (`payoff-seen.ts`). Every
 * other approved plate is drawn plain, with no script and no motion.
 *
 * THE PLATE IS ONE CONTINUOUS SPACE. The motion is the stylesheet's
 * (`verified-payoff.css`), so it starts on the first painted frame and never
 * waits for this script: the object slot opens on the object the member saw
 * while they waited (the pending plate's), which hands over to the shield as
 * it assembles; the tick embosses on the shield's corner; the mark pops once;
 * then the plate's words arrive in reading order. Nothing is swapped and no
 * sheet covers it.
 *
 * THIS SCRIPT DOES THREE SMALL THINGS, before the browser paints on a client
 * navigation:
 *   1. if this device was already shown the level (either door's key), it
 *      marks the plate seen, which stops every animation on the final frame
 *   2. otherwise it remembers the level (cookie and both keys), so a reload,
 *      either door or a second visit never plays it again
 *   3. it gives the ONE heavy haptic on the pop (`payoff-haptic.ts`), or at
 *      once where a quiet mode has no pop
 * No words of its own: the plate's title and pill say what happened.
 */
export function VerifiedPayoff({ children, tier }: { children: ReactNode; tier: number }) {
  const root = useRef<HTMLDivElement | null>(null);
  /* Decided once per mount (a strict-mode re-run must not see its own mark). */
  const decided = useRef<"play" | "rest" | null>(null);

  useLayoutEffect(() => {
    const plate = root.current;
    if (!plate) return;
    const keys = vpassKeys(tier);
    if (decided.current === null) {
      decided.current = keys.some((key) => seenOnce(key)) ? "rest" : "play";
      for (const key of keys) markSeen(key);
      try {
        document.cookie = `${VPASS_COOKIE}=${tier}; path=/verification; max-age=${VPASS_COOKIE_MAX_AGE_S}; samesite=lax`;
      } catch {
        /* A refused cookie costs one more payoff, never a wrong one. */
      }
    }
    if (decided.current === "rest") {
      plate.setAttribute("data-vpass-seen", "");
      return;
    }
    return hapticOnPop(plate, "nf-vpass-pop");
  }, [tier]);

  return (
    <div ref={root} className="nf-vpass-plate" data-vpass="play" data-testid="verified-mark" suppressHydrationWarning>
      {children}
    </div>
  );
}
