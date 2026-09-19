"use client";

import { useEffect } from "react";

/**
 * Harness only. The bloom moves focus to its nearest lozenge when it opens,
 * and a browser that has seen no pointer yet paints that focus as a keyboard
 * ring. A person opens the fan with a thumb, so the ring is never on the
 * screen the render is compared against; this drops it once the fan has
 * mounted so the proof shows the state a tap produces. Nothing here ships.
 */
export function SettleFocus() {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return null;
}
