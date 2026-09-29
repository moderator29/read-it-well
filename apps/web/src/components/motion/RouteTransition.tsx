/// <reference types="react/canary" />
"use client";

import { ViewTransition, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { MOTION_EVENT } from "@/lib/motion/motion-pref";
import { markNav, markNavTo, settleNav } from "@/lib/motion/nav-direction";

/**
 * THE PAGE MOVES WHEN YOU MOVE (motion sweep, 29 September 2026).
 *
 * Rendered by each route group's `template.tsx`. A template is re-mounted on
 * every navigation between its child segments, so this `<ViewTransition>`
 * enters with the new page and exits with the old one, and React hands the
 * swap to the browser's View Transitions API. The App Router already runs
 * navigation as a transition, which is what makes React animate it; nothing
 * here starts a transition or waits for one.
 *
 * `default="none"`: updates inside a page (a filter, a Suspense reveal, a
 * refresh) never animate as a page change. Only entering and leaving do.
 *
 * The keyframes, and which way they go, live in `app/css/route-motion.css`.
 *
 * GATES. Motion set to Off asks React for no transition at all, so not even
 * a snapshot is taken. The side flip tags its navigation `nf-flip` and gets
 * none either: its own turn is the motion. Calm and the operating system's
 * reduced motion are answered in the stylesheet.
 */
const PAGE = { "nf-flip": "none", default: "nf-page" } as const;

function readOff(): boolean {
  return document.documentElement.dataset.motion === "off";
}

function subscribeOff(onChange: () => void): () => void {
  window.addEventListener(MOTION_EVENT, onChange);
  return () => window.removeEventListener(MOTION_EVENT, onChange);
}

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
  markNavTo(anchor.href, anchor.closest(CHROME) !== null);
}

/* The browser's back and forward buttons and the Android back gesture carry
   no type, and far more often than not they mean back. */
function onPopState(): void {
  markNav("back");
}

function install(): () => void {
  listeners += 1;
  if (listeners === 1) {
    /* Capture, so the mark is on the root before Link's own handler starts
       the navigation. */
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    uninstall = () => {
      document.removeEventListener("click", onClick, true);
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
  const off = useSyncExternalStore(subscribeOff, readOff, () => false);

  useEffect(() => {
    const remove = install();
    /* This page has arrived and its transition has begun: the direction
       mark can come down shortly. */
    settleNav();
    return remove;
  }, []);

  const kind = off ? "none" : PAGE;
  return (
    <ViewTransition enter={kind} exit={kind} default="none">
      {children}
    </ViewTransition>
  );
}
