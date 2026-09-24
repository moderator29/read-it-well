"use client";

import { useEffect } from "react";
import { addBytes, METER_KEY, readDays } from "@/lib/ui/data-meter";

/**
 * Counts, on this phone only, the bytes each page could measure. V-79.
 *
 * On `pagehide` and when the tab is hidden, it sums `transferSize` over the
 * resource entries it has not counted yet (and the document itself, once) and
 * adds the total to today in `localStorage`. Nothing leaves the phone. The
 * resource buffer is raised to 1,000 entries so a long session in the app,
 * which is one document with many client navigations, is not cut off at the
 * browser's default of 250. Renders nothing.
 */
export function DataMeterRecorder() {
  useEffect(() => {
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return;
    try {
      performance.setResourceTimingBufferSize?.(1000);
    } catch {
      /* The default buffer is still counted. */
    }
    let counted = 0;
    let documentCounted = false;
    const flush = () => {
      try {
        const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        let bytes = 0;
        for (let i = counted; i < entries.length; i += 1) bytes += entries[i]?.transferSize ?? 0;
        counted = entries.length;
        if (!documentCounted) {
          const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
          bytes += nav?.transferSize ?? 0;
          documentCounted = true;
        }
        if (bytes <= 0) return;
        const next = addBytes(readDays(window.localStorage.getItem(METER_KEY)), bytes, Date.now());
        window.localStorage.setItem(METER_KEY, JSON.stringify(next));
      } catch {
        /* Storage refused: the meter simply shows less. */
      }
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);
  return null;
}
