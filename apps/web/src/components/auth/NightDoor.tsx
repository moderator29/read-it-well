"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { openNightDoor } from "@/lib/theme/theme-client";

/**
 * While `active`, the document is a night door: `<html>` is painted dark and
 * marked `data-door="night"`, the browser chrome and the status bar take the
 * night colour, and the member's Light comes back when it unmounts. A layout
 * effect, so both edges land before the frame is painted. See
 * `lib/theme/night-door.ts` for which screens and why.
 */
export function useNightDoor(active: boolean): void {
  useLayoutEffect(() => (active ? openNightDoor() : undefined), [active]);
}

/**
 * A night door around a whole screen that has no single root of its own
 * (Get started): the island (`data-theme="dark"`) on a box that takes no
 * part in layout, plus `useNightDoor`.
 */
export function NightDoor({ children }: { children: ReactNode }) {
  useNightDoor(true);
  return (
    <div data-theme="dark" data-night-door="" style={{ display: "contents" }}>
      {children}
    </div>
  );
}
