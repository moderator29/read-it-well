"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motionQuiet } from "@/lib/motion/gate";

/**
 * The results dim while the next set is on its way (Track M).
 *
 * The shelf is a server render, so a filter, a sort or a view change is a
 * navigation, and between the tap and the new cards there is a moment where
 * the old cards are still the whole screen. They now fade to 60 per cent in
 * 160ms, which says "this is being replaced" without a spinner and without
 * moving anything: no layout changes, so nothing jumps. The new list mounts
 * under its own key and arrives on the card entrance.
 *
 * How it knows a change has started: a click on any same-page link whose
 * query differs from the current one, or a submit of a form that targets this
 * page (the filter sheet). How it knows it has finished: the address changed.
 * A safety timer clears the dim after four seconds, so a navigation that was
 * cancelled can never leave the page greyed out.
 *
 * Reduced motion: the dim is instant, and it is still a dim, because it is
 * information rather than decoration.
 *
 * THE CARDS THAT STAY, MOVE (motion sweep 2, 30 September 2026). When a
 * filter or a sort keeps a listing on the shelf, that card now glides from
 * where it was to where it lands (FLIP) instead of blinking into its new
 * cell; cards that are new arrive on the card entrance as before, and cards
 * that left were already dimmed on their way out. The places are read once
 * when the change starts (the tap) and once when the new list is drawn, in a
 * layout effect before paint; only `translate` animates, on the Web
 * Animations API, and only for cards on or near the screen. Not under Calm,
 * Off, reduced motion or data saver.
 */
export function ResultsFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = `${pathname}?${search.toString()}`;
  /* The address the dim was started from: it applies only while the page is
     still at that address, so arriving anywhere clears it with no effect. */
  const [dimFrom, setDimFrom] = useState<string | null>(null);
  const updating = dimFrom === current;
  const timer = useRef<number | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, { left: number; top: number }> | null>(null);
  const here = useRef(current);
  useEffect(() => {
    here.current = current;
  }, [current]);

  useEffect(() => {
    const start = () => {
      before.current = motionQuiet() || document.documentElement.dataset.saveData === "on" ? null : places(box.current);
      setDimFrom(here.current);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDimFrom(null), 4000);
    };
    const onClick = (event: MouseEvent) => {
      /* Not `defaultPrevented`: a Next link prevents the default itself and
         navigates client side, which is exactly the case to catch. */
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
      if (url.search === window.location.search) return;
      start();
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || event.defaultPrevented) return;
      const action = new URL(form.action || window.location.href, window.location.href);
      if (action.pathname === window.location.pathname && (form.method || "get").toLowerCase() === "get") start();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
      window.clearTimeout(timer.current);
    };
  }, []);

  /* The new list is in the document and not yet painted: move each card
     that stayed back to where it was, then let it go. */
  useLayoutEffect(() => {
    const was = before.current;
    before.current = null;
    if (!was || was.size === 0) return;
    const now = places(box.current);
    const style = getComputedStyle(document.documentElement);
    const duration = parseFloat(style.getPropertyValue("--nf-duration-slow")) || 380;
    const easing = style.getPropertyValue("--nf-ease-entrance").trim() || "ease-out";
    for (const [key, rect] of now) {
      const from = was.get(key);
      if (!from) continue;
      const dx = from.left - rect.left;
      const dy = from.top - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      const item = box.current?.querySelector<HTMLElement>(`[data-flip-key="${CSS.escape(key)}"]`);
      item?.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration, easing });
    }
  }, [current]);

  return (
    <div
      ref={box}
      className="nf-results-fade"
      data-updating={updating ? "true" : undefined}
      aria-busy={updating || undefined}
    >
      {children}
    </div>
  );
}

/**
 * Where each result sits now, keyed by the page it opens. Only cards within a
 * screen's height of the viewport: a card far below cannot be seen moving,
 * and measuring it would be work for nothing.
 */
function places(root: HTMLElement | null): Map<string, { left: number; top: number }> {
  const out = new Map<string, { left: number; top: number }>();
  if (!root) return out;
  const reach = window.innerHeight;
  for (const item of root.querySelectorAll<HTMLElement>("ul > li")) {
    const href = item.querySelector("a[href]")?.getAttribute("href");
    if (!href || out.has(href)) continue;
    const rect = item.getBoundingClientRect();
    if (rect.bottom < -reach || rect.top > reach * 2) continue;
    item.dataset.flipKey = href;
    /* Page coordinates, so a change that also scrolls does not fling. */
    out.set(href, { left: rect.left + window.scrollX, top: rect.top + window.scrollY });
  }
  return out;
}
