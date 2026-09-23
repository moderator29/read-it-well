"use client";

import type { ReactNode } from "react";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

/**
 * Harness only (R19). Renders its children as they render at `path`: every
 * `usePathname()` below it (the rail's lit row, `BackButton`'s `useBack`)
 * reads `path` instead of the harness address, which has no console parent.
 * The router is untouched, so pressing back performs a real navigation to
 * whatever `route-parents.ts` declares for `path`.
 */
export function AsDesk({ path, children }: { path: string; children: ReactNode }) {
  return <PathnameContext.Provider value={path}>{children}</PathnameContext.Provider>;
}
