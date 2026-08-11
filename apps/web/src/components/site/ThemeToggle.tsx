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

export function ThemeToggle({
  className,
  variant = "icon",
}: {
  className?: string;
  /**
   * `icon` is the bare glyph button the marketing header uses.
   *
   * `row` is a labelled navigation row, added for the app rail and drawer. The
   * theme control now lives in the product's navigation rather than in its
   * chrome, and a glyph alone in a list of labelled destinations is a guess: in
   * a rail the row has room to say what it does, and the label is what makes it
   * findable by somebody who has never pressed it.
   */
  variant?: "icon" | "row";
}) {
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

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={flip}
        className={`nf-nav__row w-full ${className ?? ""}`}
        data-testid="theme-toggle-row"
      >
        {/*
          THE GLYPH SLOT IS A WRAPPER, AND THIS ROW WAS PUTTING IT ON THE SVG.

          `.nf-nav__glyph` is a 24px grid cell whose only job is keeping the
          labels on one vertical line; `NavTree` gives it a span and puts a 24px
          icon inside. Here it was landing on the `<svg>` itself, holding an icon
          asked for at 20. A CSS length beats a width attribute, so the sun and
          the moon were stretched 20 to 24 while their stroke stayed the width
          derived for 20 - drawn about a fifth thinner than every other glyph in
          the panel, in the lowest-contrast content token, at the foot of the
          list. That is the toggle that reads as missing rather than as faint.

          Wrapped and asked for at `md` now, which is what the slot is sized for
          and what every row above it uses.
        */}
        <span className="nf-nav__glyph" aria-hidden="true">
          <UiIcon name={theme === "dark" ? "sun" : "moon"} size="md" />
        </span>
        {/* The label states the DESTINATION, not the current state: a row
            reading "Dark" leaves you guessing whether that is what you have or
            what you would get. */}
        <span className="nf-nav__label">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={label}
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
