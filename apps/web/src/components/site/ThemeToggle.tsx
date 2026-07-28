"use client";

import { useEffect, useState } from "react";

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
      {theme === "dark" ? (
        /* Sun */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        /* Moon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.2 13.6A8.4 8.4 0 0 1 10.4 3.8a8.4 8.4 0 1 0 9.8 9.8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
