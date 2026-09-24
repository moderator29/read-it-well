"use client";

import { useEffect } from "react";
import { SAMPLE_RATE } from "@/lib/observability/vitals";

/**
 * FIELD SPEED, FROM THE PHONE IN THE PERSON'S HAND. V-80.
 *
 * One page view in ten measures itself with the browser's own
 * PerformanceObserver (no library): Largest Contentful Paint, Cumulative
 * Layout Shift, Interaction to Next Paint (the slowest interaction seen),
 * First Contentful Paint and Time to First Byte, plus the kilobytes the page
 * could measure. When the page is hidden it sends one beacon to `/api/vitals`
 * with the path (the server reduces it to a template), the connection class
 * and Save-Data. Nothing identifies the person. Renders nothing.
 */
export function VitalsReporter() {
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined" || Math.random() >= SAMPLE_RATE) return;
    const metrics: Record<string, number> = {};
    const observers: PerformanceObserver[] = [];
    const observe = (type: string, onEntry: (entry: PerformanceEntry) => void) => {
      try {
        const po = new PerformanceObserver((list) => list.getEntries().forEach(onEntry));
        po.observe({ type, buffered: true } as PerformanceObserverInit);
        observers.push(po);
      } catch {
        /* This browser does not report that metric. */
      }
    };
    observe("largest-contentful-paint", (e) => (metrics.LCP = e.startTime));
    observe("layout-shift", (e) => {
      const shift = e as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
      if (!shift.hadRecentInput) metrics.CLS = (metrics.CLS ?? 0) + (shift.value ?? 0);
    });
    observe("event", (e) => (metrics.INP = Math.max(metrics.INP ?? 0, e.duration)));
    observe("paint", (e) => {
      if (e.name === "first-contentful-paint") metrics.FCP = e.startTime;
    });

    let sent = false;
    const send = () => {
      if (sent || document.visibilityState !== "hidden") return;
      sent = true;
      try {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        if (nav) metrics.TTFB = nav.responseStart;
        const bytes = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).reduce(
          (sum, r) => sum + (r.transferSize ?? 0),
          nav?.transferSize ?? 0,
        );
        const link = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
        const body = JSON.stringify({
          path: window.location.pathname,
          metrics,
          effectiveType: link?.effectiveType,
          saveData: link?.saveData === true || document.documentElement.dataset.saveData === "on",
          transferKb: bytes / 1024,
        });
        navigator.sendBeacon?.("/api/vitals", new Blob([body], { type: "application/json" }));
      } catch {
        /* One sample lost. */
      }
    };
    document.addEventListener("visibilitychange", send);
    return () => {
      document.removeEventListener("visibilitychange", send);
      observers.forEach((po) => po.disconnect());
    };
  }, []);
  return null;
}
