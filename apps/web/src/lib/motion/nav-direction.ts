import { isAncestor, isAppRoot, normalisePath } from "@/lib/nav/resolve";

/**
 * WHICH WAY A NAVIGATION MOVES (motion sweep, 29 September 2026).
 *
 * The route transition (`components/motion/RouteTransition.tsx`) slides the
 * page in the direction the reader travelled, the way a native stack does:
 *
 *   forward  deeper into the tree: the new page arrives from the trailing
 *            edge and the old one drifts out behind it
 *   back     up the tree: the mirror image
 *   tab      sideways between top-level destinations (the dock, the rail, the
 *            logo): a crossfade, because nothing was pushed or popped
 *
 * The tree is the one the back button already uses (`lib/nav/resolve.ts`),
 * so the slide and the back arrow can never disagree about what "up" means.
 *
 * The answer is written on the root as `data-nav-dir` just before the router
 * commits, and the stylesheet (`app/css/route-motion.css`) picks the
 * keyframes from it. A root attribute rather than a React transition type,
 * because the browser's own back button and the Android back gesture arrive
 * as `popstate`, which carries no type.
 */
export type NavDirection = "forward" | "back" | "tab";

export function navDirection(from: string, to: string, fromChrome = false): NavDirection | null {
  const a = normalisePath(from);
  const b = normalisePath(to);
  if (a === b) return null;
  /* The dock, the rail and the drawer are the app's tabs: whatever the tree
     says about the two pages, a tap there moves sideways. */
  if (fromChrome) return "tab";
  if (isAncestor(b, a)) return "back";
  if (isAncestor(a, b)) return "forward";
  if (isAppRoot(b)) return "tab";
  return "forward";
}

const ATTR = "data-nav-dir";
/* The mark is taken down shortly after the new page has mounted (see
   `settleNav`), once the transition has read it. The long ceiling only
   covers a click that never became a navigation, so a stale direction
   cannot colour some later, unrelated push. */
const SETTLE_MS = 700;
const CEILING_MS = 10_000;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

function clearAfter(ms: number): void {
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => document.documentElement.removeAttribute(ATTR), ms);
}

export function markNav(direction: NavDirection | null): void {
  if (typeof document === "undefined" || !direction) return;
  document.documentElement.setAttribute(ATTR, direction);
  clearAfter(CEILING_MS);
}

/** Called by the page that just arrived: the transition has started. */
export function settleNav(): void {
  if (typeof document === "undefined") return;
  if (!document.documentElement.hasAttribute(ATTR)) return;
  clearAfter(SETTLE_MS);
}

/** Mark the move from the current page to `href`, if it is in the app. */
export function markNavTo(href: string, fromChrome = false): void {
  if (typeof window === "undefined") return;
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }
  if (url.origin !== window.location.origin) return;
  markNav(navDirection(window.location.pathname, url.pathname, fromChrome));
}
