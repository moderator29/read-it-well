"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a console page current without a manual reload: the server reads are
 * re-run every `seconds` while the tab is visible, and at once when the
 * operator comes back to the tab. `router.refresh()` re-renders the server
 * components in place, so scroll, open disclosures and focus survive.
 *
 * Every decision on the console already revalidates its own paths, so this
 * covers what somebody or something else changed: a job that ran, an alert
 * that was raised, a listing that went live.
 */
export function LiveRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(tick, seconds * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);
  return null;
}
