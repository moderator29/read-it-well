"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

/**
 * The guided flight.
 *
 * A brief, skippable full-screen sequence over the commissioned world scene
 * that plays once, on a first visit to the landing page, before handing off
 * into the ordinary page underneath. It never touches first paint: the
 * component always renders nothing on the server and on the first client
 * render, and only reveals itself from an effect after checking
 * localStorage, exactly the pattern `ThemeToggle` and `settings-store` use
 * for this kind of device-only state. Nothing about the landing page's own
 * content depends on it, so search engines and anyone who has already seen
 * it get the page immediately.
 *
 * Reduced motion skips straight through: the flight is entirely the camera
 * move on the artwork, so with no motion there is nothing left to show.
 */

const SEEN_KEY = "nf_onboarded";
const AUTO_DISMISS_MS = 5200;
const EXIT_MS = 260;

export function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* Storage unavailable: the flight simply plays again next visit. */
    }
    window.setTimeout(() => setVisible(false), EXIT_MS);
  }, []);

  useEffect(() => {
    let alreadySeen = true;
    try {
      alreadySeen = window.localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      alreadySeen = false;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (alreadySeen || reduceMotion) {
      // A returning visitor, or a visitor who asked for no motion: the
      // flight is entirely a camera move, so there is nothing honest left
      // to show without it. Mark it seen and never mount the overlay.
      try {
        window.localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* Storage unavailable: the check above simply runs again next time. */
      }
      return;
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible || leaving) return;
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [visible, leaving, dismiss]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Welcome to RentMe"
      className={`nf-onboarding nf-story-stage--paper fixed inset-0 z-[300] flex items-center justify-center overflow-hidden ${
        leaving ? "nf-onboarding--leaving" : ""
      }`}
    >
      <button
        type="button"
        onClick={dismiss}
        className="nf-onboarding-skip absolute right-4 z-10"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        Skip
      </button>

      <div className="nf-onboarding-frame relative aspect-square w-[min(72vh,92vw)]">
        <Image
          src="/brand/story-world.png"
          alt="The RentMe world: the house mark surrounded by map, keys, calendar, wallet and shield"
          fill
          priority
          sizes="92vw"
          className="nf-story-art nf-onboarding-image object-contain"
        />
      </div>

      <div className="nf-onboarding-copy nf-rise pointer-events-none absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] px-6 text-center">
        <p className="nf-overline">RentMe</p>
        <h2 className="nf-h2 mx-auto mt-1.5 max-w-[24ch]">
          Search, book, message and pay. All in one place.
        </h2>
      </div>
    </div>
  );
}
