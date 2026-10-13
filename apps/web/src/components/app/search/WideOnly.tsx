"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const WIDE = "(min-width: 64rem)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Mounts its children on a wide screen only: the list's sticky map on a
 * desktop. Hiding it with CSS alone would still start the map engine and
 * fetch tiles on every phone that opened the list, behind a `display: none`
 * frame of zero size, so on a phone nothing under here is mounted at all.
 * The server and the first paint draw nothing, and the map arrives once the
 * width is known.
 */
export function WideOnly({ children }: { children: ReactNode }) {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
  return wide ? <>{children}</> : null;
}
