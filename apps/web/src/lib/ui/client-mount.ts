"use client";

import { useSyncExternalStore } from "react";

/**
 * False on the server and during hydration, true from the first client commit.
 *
 * ---------------------------------------------------------------------------
 * WHY IT LIVES IN `lib/ui` AND NOT IN `components/app`.
 *
 * It was in `components/app/`, which was right while every
 * consumer was a product component. The fifth consumer is `components/ui/Sheet`,
 * and `components/ui` is the PRIMITIVE layer that `components/app` is built on
 * top of: every dependency between those two directories runs app -> ui, and an
 * import the other way was the only line in the tree that did not. A primitive
 * reaching up into the product is how a UI kit stops being one, because the kit
 * can no longer be lifted out or reasoned about without the product around it.
 *
 * `lib/ui` is where the neutral hooks already live - `use-overlay.ts`,
 * `data-saver.ts`, `history.ts`, `undo-window.ts` - and `Sheet.tsx` already
 * reads `use-overlay` from here, so this is the shelf it belonged on.
 *
 * The move is a rename plus five one-line import changes. Nothing about the
 * hook itself changed.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS AT ALL.
 *
 * `createPortal(panel, document.body)` cannot run where there is no document,
 * so every drawer, sheet and viewer in this product needs to know whether it is
 * on the client yet. Four components answered that question with the same four
 * lines:
 *
 *     const [mounted, setMounted] = useState(false);
 *     useEffect(() => setMounted(true), []);
 *
 * which works, and which React 19 flags as `react-hooks/set-state-in-effect`,
 * correctly: it schedules a second render of that component for a fact that was
 * already knowable at the moment the effect ran. `useSyncExternalStore` asks the
 * same question in the way React has a channel for, with no state to set and no
 * cascading render.
 *
 * ---------------------------------------------------------------------------
 * WHY `subscribe` DOES NOTHING.
 *
 * The value it reports never changes: once a component is on the client it stays
 * there for its whole life. So there is nothing to notify about, and the
 * subscribe function exists only because the hook's contract requires one. It is
 * module-level and constant rather than inline, because a fresh function on every
 * render would make React resubscribe on every render for no reason.
 *
 * The two snapshot readers are the whole mechanism: `getServerSnapshot` answers
 * false while the server renders and while React hydrates, `getSnapshot` answers
 * true afterwards, and React expects them to differ rather than reporting a
 * hydration mismatch. That last part is the reason this is not simply
 * `typeof document !== "undefined"`, which would answer true DURING hydration on
 * the client and mismatch the server's markup.
 */

/* Constant, so React does not resubscribe on every render. Nothing to clean up,
   because nothing was subscribed to. */
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function useClientMount(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
