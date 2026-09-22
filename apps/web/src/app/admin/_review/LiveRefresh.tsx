"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a review desk current without a manual reload.
 *
 * Every desk is a server component that reads on each request, so a
 * `router.refresh()` re-runs the reads and swaps in the new rows while keeping
 * scroll, open rows and anything typed in a field. It runs every thirty
 * seconds while the tab is visible and once more the moment the tab comes
 * back, and never while the page is hidden, so a console left open overnight
 * does not poll the database for nobody.
 *
 * The decisions themselves already refresh the page the instant they land;
 * this is for work that arrives while the reviewer is looking.
 */
export function LiveRefresh({ everyMs = 30_000 }: { everyMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => router.refresh(), everyMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, everyMs]);

  return null;
}
