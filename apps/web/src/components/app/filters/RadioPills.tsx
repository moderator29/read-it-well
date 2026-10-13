"use client";

import { useRef } from "react";
import "@/components/app/search/search-v2.css";

/**
 * ONE ANSWER FROM A SHORT ROW: the filter sheet's segmented market and its
 * "Any, 1+, 2+, 3+, 4+, 5+" rows.
 *
 * A radio group, because exactly one answer is in force: `role="radiogroup"`
 * named by its heading, each option `role="radio"` with `aria-checked`, and
 * the keyboard a radio group has everywhere else (one tab stop on the chosen
 * option; the arrows, Home and End move the choice). A group whose answer is
 * "none yet" (the market before one is chosen) puts its tab stop on the first
 * option, so it is never unreachable.
 *
 * `allowClear` keeps the sheet's old behaviour for the market: tapping the
 * chosen option again takes the answer away (any market), which a plain radio
 * group cannot express and the sheet always could.
 */
export function RadioPills<T extends string | number>({
  label,
  labelledBy,
  options,
  value,
  onPick,
  testPrefix,
  allowClear = false,
  className = "",
}: {
  /** The group's name when no visible heading names it. */
  label?: string;
  /** The id of the visible heading that names it. */
  labelledBy?: string;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  value: T | undefined;
  onPick: (next: T | undefined) => void;
  testPrefix: string;
  allowClear?: boolean;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const live = options.map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled);
  const chosenIndex = options.findIndex((option) => option.value === value);
  const stop = chosenIndex >= 0 ? chosenIndex : (live[0]?.index ?? 0);

  function move(from: number, step: 1 | -1 | "first" | "last") {
    if (live.length === 0) return;
    const at = live.findIndex(({ index }) => index === from);
    const next =
      step === "first"
        ? live[0]!
        : step === "last"
          ? live[live.length - 1]!
          : live[(at + step + live.length) % live.length]!;
    onPick(next.option.value);
    refs.current[next.index]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={`nf-seg ${className}`}
      data-testid={`${testPrefix}-group`}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === stop ? 0 : -1}
            disabled={option.disabled}
            data-testid={`${testPrefix}-${String(option.value)}`}
            onClick={() => onPick(checked && allowClear ? undefined : option.value)}
            onKeyDown={(event) => {
              const keys: Record<string, 1 | -1 | "first" | "last"> = {
                ArrowRight: 1,
                ArrowDown: 1,
                ArrowLeft: -1,
                ArrowUp: -1,
                Home: "first",
                End: "last",
              };
              const step = keys[event.key];
              if (step === undefined) return;
              event.preventDefault();
              move(index, step);
            }}
            className="nf-seg__opt"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
