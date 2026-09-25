"use client";

import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { THEME_EVENT, readThemeChoice, setThemeChoice, watchSystemTheme } from "@/lib/theme/theme-client";
import type { ThemeChoice } from "@/lib/theme/theme";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

const OPTIONS: readonly { value: ThemeChoice; icon: UiIconName; key: "light" | "dark" | "system" }[] = [
  { value: "light", icon: "sun", key: "light" },
  { value: "dark", icon: "moon", key: "dark" },
  { value: "system", icon: "contrast", key: "system" },
];

/**
 * Light / Dark / System, at the foot of the side navigation.
 *
 * Three radios, not a toggle: "System" is a real third answer (follow the
 * phone) and a two-state switch cannot say it. Each option carries its word
 * AND its glyph, stacked, so the three fit the drawer's width at 390px without
 * eliding a label and each cell is at least 44px tall. A radio group in the
 * ARIA sense: one tab stop, arrow keys move AND select, Home and End jump.
 */
export function ThemeControl({
  labels = { group: "Appearance", light: "Light", dark: "Dark", system: "System" },
  className,
}: {
  labels?: { group: string; light: string; dark: string; system: string };
  className?: string;
}) {
  const choice = useSyncExternalStore<ThemeChoice>(subscribe, readThemeChoice, () => "dark");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === choice));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = OPTIONS.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (index + 1) % OPTIONS.length
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (index + last) % OPTIONS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    setThemeChoice(OPTIONS[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={labels.group}
      onKeyDown={onKeyDown}
      className={`nf-theme-control ${className ?? ""}`}
      data-testid="theme-control"
    >
      {OPTIONS.map((option, i) => {
        const on = option.value === choice;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => setThemeChoice(option.value)}
            className="nf-theme-control__option"
          >
            <UiIcon name={option.icon} size={18} />
            <span>{labels[option.key]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Mounted once in the root layout: follows the OS for "system", and other tabs. */
export function ThemeSync() {
  useEffect(() => watchSystemTheme(), []);
  return null;
}
