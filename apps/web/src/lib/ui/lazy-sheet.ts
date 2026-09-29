"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * A SHEET WHOSE BODY IS FETCHED WHEN IT IS WANTED.
 *
 * The filter drawers and the report sheet drew their whole body (and, through
 * it, everything the body imports) into the first load of every page carrying
 * their trigger, though most visits never open them. The trigger stays in the
 * page; the body is its own chunk (`next/dynamic`, `ssr: false`), loaded:
 *
 *   - AHEAD, when the pointer comes over the trigger or focus lands on it
 *     (`warmProps`), so by the time the tap lands the chunk is usually here;
 *   - on the tap itself otherwise, while the trigger shows `pending` (a small
 *     spinner in place of its glyph, and `aria-busy`), so the first open never
 *     feels dead.
 *
 * The body is rendered only once its chunk has ARRIVED (`ready`), never while
 * it is in flight. That is what keeps the behaviour identical: the `Sheet`
 * mounts already open, so its two-frame entrance runs exactly as before, and
 * it reads the focused element on mount, which is still the trigger, so focus
 * goes into the sheet and back to the trigger on the way out. It also means a
 * chunk that fails to load (offline, a deploy in between) is not a thrown
 * render and an error page: `warm` resolves false and the caller simply leaves
 * the sheet shut, with the trigger live to try again.
 *
 * Once a body has mounted the caller keeps it mounted while closed, so a draft
 * or a filed report survives closing and reopening as it always did.
 */

/* Chunks already here, shared by every trigger on the page, so a second report
   link opens at once instead of flashing the spinner for a microtask. */
const arrived = new WeakSet<() => Promise<unknown>>();

export function useLazySheet(
  load: () => Promise<unknown>,
  {
    eager = false,
    onEagerFail,
  }: {
    /** Fetch at mount: for a sheet that opens on mount (`openOnMount`). */
    eager?: boolean;
    /** Called when that fetch fails, so the caller can shut the sheet. */
    onEagerFail?: () => void;
  } = {},
) {
  const [ready, setReady] = useState(() => arrived.has(load));

  const warm = useCallback(
    (): Promise<boolean> =>
      load().then(
        () => {
          arrived.add(load);
          setReady(true);
          return true;
        },
        () => false,
      ),
    [load],
  );

  /* Mount only: `eager` is the initial `openOnMount`, not a live switch. */
  const [eagerAtMount] = useState(eager);
  const [failAtMount] = useState(() => onEagerFail);
  useEffect(() => {
    if (!eagerAtMount) return;
    void warm().then((ok) => {
      if (!ok) failAtMount?.();
    });
  }, [eagerAtMount, failAtMount, warm]);

  const prefetch = useCallback(() => {
    void warm();
  }, [warm]);

  return {
    ready,
    warm,
    /** Spread onto the trigger: fetch the body on hover or focus. */
    warmProps: { onPointerEnter: prefetch, onFocus: prefetch },
  };
}
