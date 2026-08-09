"use client";

import { useEffect, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Light and dark switch.
 *
 * Dark is the designed default; light is a first-class alternative driven by
 * the same tokens. The choice persists in localStorage and lands on the root
 * element as data-theme, which the token sheet keys off. A tiny inline script
 * in the root layout applies the stored theme before first paint, so there is
 * never a flash of the wrong mode; this control only has to flip and store.
 */
const STORE = "nf_theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === "light") setTheme("light");
  }, []);

  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(STORE, next);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`nf-icon-btn h-9 w-9 ${className ?? ""}`}
    >
      {/*
        Two hand-drawn SVGs used to live here, inline, each with its own
        `strokeWidth="1.8"` and its own 16px hardcoded size - two more members
        of the ad-hoc icon population the sweep exists to remove. They are on
        the platform family now, at a named step, at the platform's own derived
        stroke, and they inherit `currentColor` exactly as they did.
      */}
      <UiIcon name={theme === "dark" ? "sun" : "moon"} size="sm" />
    </button>
  );
}
