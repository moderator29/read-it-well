"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long a button shows its check after the job lands. */
export const DONE_FLASH_MS = 1600;

/**
 * The beat after a small win: `flash()` when a save or a send lands, and
 * `done` is true for a moment, which a `Button` shows as its check. Calling
 * it again restarts the beat.
 */
export function useDoneFlash(ms: number = DONE_FLASH_MS): readonly [boolean, () => void] {
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);
  const flash = useCallback(() => {
    setDone(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), ms);
  }, [ms]);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  return [done, flash] as const;
}
