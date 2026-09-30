/// <reference types="react/canary" />
"use client";

import { ViewTransition, useEffect, useLayoutEffect, type ReactNode } from "react";
import { markNav, markNavTo, settleNav } from "@/lib/motion/nav-direction";
import { applyOrigin, captureOrigin, noteTap, settleOrigin } from "@/lib/motion/nav-origin";

/**
 * THE PAGE MOVES WHEN YOU MOVE (motion sweep, 29 September 2026; origin and
 * depth, 30 September 2026).
 *
 * Rendered by each route group's `template.tsx`. A template is re-mounted on
 * every navigation between its child segments, so this `<ViewTransition>`
 * mounts with the new page, and that is what makes React run the navigation
 * inside the browser's View Transitions API. Nothing here starts a transition
 * or waits for one.
 *
 * THE PAGE TRAVELS AS THE ROOT SNAPSHOT. The first sweep had React name the
 * page (`enter="nf-page"`), which split a page with several top-level nodes
 * into several groups, each moving about its own centre. Now React names
 * nothing (`enter="none"`, `exit="none"`, `default="none"`): the page stays in
 * the browser's one full-screen root snapshot, which can scale about the
 * point that was tapped and dim behind the next page like a native push. The
 * chrome (header, dock, rail) carries names of its own and holds still above
 * it. The keyframes live in `app/css/route-motion.css`.
 *
 * WHERE IT GROWS FROM. The click listener below remembers the tapped element
 * (`lib/motion/nav-origin.ts`) and, for a card or a row, lends it the name
 * `nf-origin` so its snapshot can grow and dissolve into the new page. The
 * layout effect writes the point on the root while the transition is still
 * capturing, so the animation starts from it.
 *
 * GATES. Off, Calm, reduced motion and the side flip are answered in the
 * stylesheet (Off and reduced: nothing moves; Calm: a short fade; the flip's
 * own turn is the only motion). The origin is not lent under Calm, Off,
 * reduced motion or data saver.
 */

/* ------------------------------------------------ the direction listeners */

let listeners = 0;
let uninstall: (() => void) | null = null;

const CHROME = ".nf-tabbar, .nf-nav, .nf-dockmore, .nf-app-header__brand, .nf-site-nav";

function onClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target && anchor.target !== "_self") return;
  if (anchor.hasAttribute("download")) return;
  const fromChrome = anchor.closest(CHROME) !== null;
  markNavTo(anchor.href, fromChrome);
  /* A forward move from the page (not a tab switch from the dock or the
     rail, and not up the tree) opens from what was tapped. */
  if (!fromChrome && document.documentElement.getAttribute("data-nav-dir") === "forward") {
    try {
      captureOrigin(anchor, new URL(anchor.href, window.location.href));
    } catch {
      /* A malformed href navigates as it would have; it just opens flat. */
    }
  }
}

/* Any press, remembered for a moment: a button that navigates with
   `router.push` has no href to read, but the page should still open from it. */
function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || !(event.target instanceof Element)) return;
  if (event.target.closest(CHROME)) return;
  noteTap(event.target);
}

/* The browser's back and forward buttons and the Android back gesture carry
   no type, and far more often than not they mean back. */
function onPopState(): void {
  markNav("back");
}

function install(): () => void {
  listeners += 1;
  if (listeners === 1) {
    /*
     * KEEP THE ROOT SNAPSHOT. When no boundary inside a transition animates,
     * React cancels the root's snapshot so an unrelated update cannot
     * crossfade the whole page: it sets `view-transition-name: none` on
     * <html> and hides the root group. That is right for React in general
     * and exactly wrong here, where the root snapshot IS the page. React
     * only does it when <html> has no inline name of its own, so the name
     * the browser gives it anyway is written inline. Only the route templates
     * use <ViewTransition>, so the root still moves only on a navigation.
     */
    document.documentElement.style.setProperty("view-transition-name", "root");
    /* Capture, so the mark is on the root before Link's own handler starts
       the navigation. */
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    window.addEventListener("popstate", onPopState);
    uninstall = () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("popstate", onPopState);
    };
  }
  return () => {
    listeners -= 1;
    if (listeners === 0 && uninstall) {
      uninstall();
      uninstall = null;
    }
  };
}

export function RouteTransition({ children }: { children: ReactNode }) {
  /* Inside the transition's update, before the new state is captured: the
     animation starts from the point written here. */
  useLayoutEffect(() => {
    applyOrigin(window.location.pathname, document.documentElement.dataset.navDir);
  }, []);

  useEffect(() => {
    const remove = install();
    /* This page has arrived and its transition has begun: the direction
       mark can come down shortly. */
    settleNav();
    settleOrigin();
    return remove;
  }, []);

  return (
    <ViewTransition enter="none" exit="none" default="none">
      {children}
    </ViewTransition>
  );
}
