"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * Whether an element is on screen, for the motion kit (Track M).
 *
 * `once` latches on the first entry, which is what an entrance wants. Without
 * it the answer follows the element in and out, which is what a loop wants so
 * it can pause off screen.
 *
 * WHERE THERE IS NO OBSERVER THE ANSWER IS "YES". An older WebView without
 * `IntersectionObserver` gets content that is shown and loops that run, never a
 * blank band waiting for an event that cannot arrive (the F2-054 lesson in
 * `components/site/Reveal.tsx`).
 */
export function useInView(
  ref: RefObject<Element | null>,
  { once = false, rootMargin = "0px 0px -8% 0px" }: { once?: boolean; rootMargin?: string } = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setInView(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          setInView(e.isIntersecting);
          if (e.isIntersecting && once) io.disconnect();
        }
      },
      { threshold: 0, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, once, rootMargin]);

  return inView;
}

/**
 * On screen AND in a tab somebody is looking at. The two conditions a loop
 * must meet to be allowed to run.
 */
export function usePlayWhenVisible(ref: RefObject<Element | null>): boolean {
  const inView = useInView(ref, { rootMargin: "0px" });
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const read = () => setPageVisible(document.visibilityState !== "hidden");
    read();
    document.addEventListener("visibilitychange", read);
    return () => document.removeEventListener("visibilitychange", read);
  }, []);

  return inView && pageVisible;
}

/** The reader's reduced-motion setting, live. False on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduce, readReduce, () => false);
}

const REDUCE = "(prefers-reduced-motion: reduce)";
function subscribeReduce(onChange: () => void): () => void {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function readReduce(): boolean {
  return window.matchMedia(REDUCE).matches;
}

/** True once the page is hydrated on the client; false in the server render. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}
function noSubscribe(): () => void {
  return () => {};
}
