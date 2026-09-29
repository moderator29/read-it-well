"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canGoBackInApp } from "@/lib/ui/history";
import { chooseBack, parentOf, type BackDecision } from "./resolve";
import { previousEntry } from "./previous-entry";

/**
 * The one back control behaviour, for every drawn back control on the platform
 * and for Android's hardware button (`NativeRuntime`).
 *
 * `components/ui/BackControl.tsx` is the one drawn control, and everything
 * that draws a back arrow goes through it or through this hook. None of them
 * calls `router.back()` on its own: `chooseBack` decides, from the route map
 * and the screen behind, and `docs/BACK_NAVIGATION.md` is the resulting table.
 *
 * `fallback` is reached in exactly two situations: a route with no entry in
 * `route-parents.ts`, and a root, which should not be drawing a back control
 * in the first place. A route with a declared parent ignores it.
 */

type RouterLike = { back(): void; replace(href: string): void };

/** The decision, taken now, against the live history. */
export function decideBack(path: string, fallback: string, surface: "web" | "android"): BackDecision {
  const previous = previousEntry();
  return chooseBack({
    path,
    fallback,
    previousPath: previous?.path ?? null,
    previousDistance: previous?.distance ?? 1,
    previousIsInApp: canGoBackInApp(),
    surface,
  });
}

/** Parents that are redirects decided on the server (`route-parents.ts`). */
const SERVER_REDIRECTS = new Set(["/home-or-landing"]);

/** Carry a decision out. `exit` is Android's alone and is handled there. */
export function performBack(decision: BackDecision, router: RouterLike): void {
  if (decision.action === "back") {
    if (decision.delta > 1) window.history.go(-decision.delta);
    else router.back();
  } else if (decision.action === "replace") {
    /* A route handler answers with a redirect, not a page, so it gets a real
       request rather than a router transition. */
    if (SERVER_REDIRECTS.has(decision.href)) window.location.replace(decision.href);
    else router.replace(decision.href);
  }
}

/**
 * A second press before the first one has landed is dropped. Without this a
 * double tap on a slow phone walked two entries back, or replaced the parent
 * with the grandparent before the parent had painted.
 */
const SETTLE_MS = 800;

export function useBack(fallback = "/home"): () => void {
  const router = useRouter();
  const pathname = usePathname();
  const pressedAt = useRef<{ path: string; at: number } | null>(null);

  return useCallback(() => {
    const path = pathname ?? "/";
    const last = pressedAt.current;
    const now = Date.now();
    if (last && last.path === path && now - last.at < SETTLE_MS) return;
    pressedAt.current = { path, at: now };

    const decision = decideBack(path, fallback, "web");

    if (decision.action === "replace" && decision.reason === "no-parent-declared" && process.env.NODE_ENV !== "production") {
      /* Loud on purpose: a route with no declared parent is a hole in
         `lib/nav/route-parents.ts`. */
      console.warn(
        `[nav] "${path}" has no declared parent. Add it to lib/nav/route-parents.ts. ` +
          `Falling back to "${decision.href}".`,
      );
    }

    performBack(decision, router);
  }, [router, pathname, fallback]);
}

/**
 * Where this screen's back control will lead, for DRAWING it: the accessible
 * name ("Back to Messages") and a hover target.
 *
 * The server render and the first client render answer the declared parent,
 * because history is not readable on the server and the two must match. After
 * mount it is re-read against the live history, so the name says where the
 * press will actually go (the screen the person came from, when that is safe).
 */
export function useBackDestination(fallback = "/home"): string {
  const pathname = usePathname();
  const path = pathname ?? "/";
  const target = parentOf(path);
  const declared = target.kind === "parent" ? target.href : fallback;
  const [live, setLive] = useState<{ path: string; href: string } | null>(null);

  useEffect(() => {
    /* Read after the router has written this screen's entry. A microtask is
       enough: Next writes history in an insertion effect, before this runs,
       and the deferral keeps the state update out of the effect body. */
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const decision = decideBack(path, fallback, "web");
      setLive({ path, href: "href" in decision ? decision.href : declared });
    });
    return () => {
      cancelled = true;
    };
  }, [path, fallback, declared]);

  return live && live.path === path ? live.href : declared;
}

/**
 * The declared destination as an href, never history. For a `<Link>` or a
 * middle-click that opens the parent in a new tab.
 */
export function useBackHref(fallback = "/home"): string {
  const pathname = usePathname();
  const target = parentOf(pathname ?? "/");
  return target.kind === "parent" ? target.href : fallback;
}
