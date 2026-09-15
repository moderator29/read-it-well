"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that gives Vallo its offline shell.
 *
 * Four deliberate constraints:
 *
 *   - Production only. A worker in development caches build output that
 *     changes on every keystroke and produces phantom stale bugs.
 *   - After the window load event, so registration never competes with first
 *     paint on a mid-range Android. The shell precache is a background errand,
 *     not part of getting the page up.
 *   - Feature detected. No serviceWorker in navigator (older Android
 *     browsers, or any private-mode restriction) means simply no worker, with
 *     nothing else different about the app.
 *   - Silent on failure. A worker is an enhancement. If registration is
 *     refused, the site must behave exactly as it did before it existed, so
 *     nothing is thrown and nothing is shown to the user.
 *
 * Renders nothing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    const register = () => {
      if (cancelled) return;
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* An enhancement that did not land. The app is unaffected. */
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
