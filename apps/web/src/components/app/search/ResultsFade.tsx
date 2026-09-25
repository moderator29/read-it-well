"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
  const here = useRef(current);
  useEffect(() => {
    here.current = current;
  }, [current]);

  useEffect(() => {
    const start = () => {
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

  return (
    <div className="nf-results-fade" data-updating={updating ? "true" : undefined} aria-busy={updating || undefined}>
      {children}
    </div>
  );
}
