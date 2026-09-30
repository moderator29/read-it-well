"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a console page current without a manual reload: the server reads are
 * re-run every `seconds` while the tab is visible, and at once when the
 * operator comes back to the tab. `router.refresh()` re-renders the server
 * components in place, so scroll, open disclosures, focus and anything typed
 * in a field survive. It never polls while the tab is hidden, so a console
 * left open overnight does not query the database for nobody.
 *
 * Every decision on the console already revalidates its own paths, so this
 * covers what somebody or something else changed: a job that ran, an alert
 * that was raised, a listing that went live.
 *
 * ONE COMPONENT FOR THE JOB (C12): the review desks had their own copy in
 * `_review/LiveRefresh.tsx` at 30 seconds; they now pass `seconds={30}` here.
 */
export function LiveRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => router.refresh(), seconds * 1000);
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
  }, [router, seconds]);
  return null;
}
