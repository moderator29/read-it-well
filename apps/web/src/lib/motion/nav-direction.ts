import { isAncestor, isAppRoot, normalisePath } from "@/lib/nav/resolve";
import { prepareReturn, returnPending } from "./nav-origin";

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

/**
 * Called by the page that just arrived. When the browser exposes the running
 * transition, the mark comes down once it has finished: on a slow phone the
 * capture can land well after the page mounted, and a mark taken down first
 * turned a tab switch into a push (seen under data saver). Elsewhere, after
 * the settle delay.
 */
export function settleNav(): void {
  if (typeof document === "undefined") return;
  if (!document.documentElement.hasAttribute(ATTR)) return;
  if (afterTransition(() => clearAfter(0))) return;
  clearAfter(SETTLE_MS);
}

/** Run `done` when the active view transition finishes; false if none. */
export function afterTransition(done: () => void): boolean {
  const vt = (document as Document & { activeViewTransition?: { finished: Promise<unknown> } | null }).activeViewTransition;
  if (!vt?.finished) return false;
  vt.finished.then(done, done);
  return true;
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

/*
 * THE IN-APP BACK SLIDES BACK TOO.
 *
 * React only animates a navigation it runs as a transition, and a history
 * traversal is not one: the App Router answers `popstate` synchronously (so
 * the browser can restore the scroll position), and no view transition
 * starts. Measured on the dev server, the browser's back button produced
 * none at all.
 *
 * The back arrow (BackControl) and the Android back button (NativeRuntime)
 * both go through `performBack`, and there the traversal is ours to start. So
 * it starts inside a view transition of its own: the browser captures the
 * page as it is, the traversal runs, and the update resolves once the router
 * has committed (the `popstate` has fired and React has painted) or after a
 * short ceiling, so a route that is not cached never holds the screen. The
 * `nf-back` type selects the backwards slide in route-motion.css; the page is
 * not wrapped in named groups here, so it moves as the root snapshot while
 * the named chrome stays still.
 *
 * The browser's own back button and a swipe on iOS keep the browser's own
 * behaviour, which on iOS is already an animation of its own.
 */
const BACK_CEILING_MS = 350;
const AFTER_COMMIT_MS = 32;

type TypedTransitionDoc = Document & {
  startViewTransition?: (options: { update: () => Promise<void>; types: string[] }) => unknown;
};

function typedTransitionsSupported(): boolean {
  try {
    return CSS.supports("selector(:active-view-transition-type(a))");
  } catch {
    return false;
  }
}

export function animateBack(go: () => void): void {
  const doc = document as TypedTransitionDoc;
  const root = document.documentElement;
  const off = root.dataset.motion === "off";
  let reduce = false;
  try {
    reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    reduce = true;
  }
  if (off || reduce || typeof doc.startViewTransition !== "function" || !typedTransitionsSupported()) {
    go();
    return;
  }
  markNav("back");
  const leaving = window.location.pathname;
  doc.startViewTransition({
    types: ["nf-back"],
    update: () =>
      new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          window.removeEventListener("popstate", onPop);
          resolve();
        };
        /* The page coming back may hold the card this one was opened from
           (lib/motion/nav-origin.ts). Then the capture waits, looking every
           16ms (rendering is paused, so not a frame) and never past the
           ceiling, until that card is drawn, so the
           page being left can shrink back into it. */
        const onPop = () => {
          if (!returnPending(leaving)) {
            window.setTimeout(finish, AFTER_COMMIT_MS);
            return;
          }
          const look = () => {
            if (settled) return;
            if (prepareReturn(leaving)) finish();
            else window.setTimeout(look, 16);
          };
          look();
        };
        window.addEventListener("popstate", onPop);
        window.setTimeout(finish, BACK_CEILING_MS);
        go();
      }),
  });
}
