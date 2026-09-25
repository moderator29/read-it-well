"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
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

/**
 * THE THEME AS A FEATURE ROW (Track M, 25 September 2026).
 *
 * The founder asked for appearance to read like the rows of the account
 * screen in the pump.fun reference, "not a bare switch": the glyph of the
 * current choice in the panel's shared slot, the word Appearance, the current
 * value set quiet on the right, and a chevron. Tapping the row opens the same
 * three-way radio group beneath it, so "System" is still a real answer and the
 * keyboard contract of `ThemeControl` is unchanged. The row is a disclosure
 * button, which is what it is: it shows and hides a control.
 */
export function ThemeRow({
  labels = { group: "Appearance", light: "Light", dark: "Dark", system: "System" },
}: {
  labels?: { group: string; light: string; dark: string; system: string };
}) {
  const choice = useSyncExternalStore<ThemeChoice>(subscribe, readThemeChoice, () => "dark");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const current = OPTIONS.find((o) => o.value === choice) ?? OPTIONS[1]!;
  return (
    <div className="nf-theme-row" data-open={open || undefined}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="nf-theme-row__head nf-tap"
        data-testid="theme-row"
      >
        <span className="nf-nav__glyph" aria-hidden="true">
          <UiIcon name={current.icon} size="md" />
        </span>
        <span className="nf-theme-row__label">{labels.group}</span>
        <span className="nf-theme-row__value">{labels[current.key]}</span>
        <span className="nf-theme-row__chev" aria-hidden="true" />
      </button>
      <div id={panelId} className="nf-theme-row__panel" hidden={!open}>
        <ThemeControl labels={labels} />
      </div>
    </div>
  );
}

/** Mounted once in the root layout: follows the OS for "system", and other tabs. */
export function ThemeSync() {
  useEffect(() => watchSystemTheme(), []);
  return null;
}
