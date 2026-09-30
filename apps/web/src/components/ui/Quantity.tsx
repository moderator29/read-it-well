"use client";

import { UiIcon } from "@/design-system/icons/UiIcon";
import { feedback } from "@/lib/ui/feedback";

/**
 * The quantity stepper (reference 55, kind 9): minus, the value, plus, in one
 * white capsule (navy at night) with two 44px round buttons
 * (`.nf-qty`, controls.css). Guests, rooms, nights, units.
 *
 * The value is clamped to `min`..`max` and each button disables itself at its
 * end, so the control can never offer a press that does nothing. The words
 * come from the caller (the house pattern: the server parent holds `t`).
 */
export type QuantityProps = {
  value: number;
  onChange(next: number): void;
  /** The group's accessible name ("Guests"). */
  label: string;
  /** The minus button's name ("Fewer guests"). */
  decreaseLabel: string;
  /** The plus button's name ("More guests"). */
  increaseLabel: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
};

/** The next value for a press, clamped; pure so it can be tested alone. */
export function stepQuantity(value: number, delta: number, min: number, max: number): number {
  const next = value + delta;
  if (!Number.isFinite(next)) return Math.min(max, Math.max(min, value));
  return Math.min(max, Math.max(min, next));
}

export function Quantity({
  value,
  onChange,
  label,
  decreaseLabel,
  increaseLabel,
  min = 0,
  max = 99,
  step = 1,
  disabled = false,
  className,
  "data-testid": testId,
}: QuantityProps) {
  const atMin = value <= min;
  const atMax = value >= max;
  const press = (delta: number) => {
    const next = stepQuantity(value, delta, min, max);
    if (next === value) return;
    feedback("select");
    onChange(next);
  };
  return (
    <div
      role="group"
      aria-label={label}
      data-disabled={disabled || undefined}
      data-testid={testId}
      className={["nf-qty", className ?? ""].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        className="nf-qty__btn"
        aria-label={decreaseLabel}
        disabled={disabled || atMin}
        onClick={() => press(-step)}
      >
        <UiIcon name="minus" size={20} />
      </button>
      <output className="nf-qty__value" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="nf-qty__btn"
        aria-label={increaseLabel}
        disabled={disabled || atMax}
        onClick={() => press(step)}
      >
        <UiIcon name="plus" size={20} />
      </button>
    </div>
  );
}
