"use client";

import { useId } from "react";

/**
 * Switch row for settings groups.
 *
 * A real `role="switch"` button with `aria-checked`, labelled by its visible
 * text, so screen readers announce state changes without extra wiring. The
 * knob slides with a Tailwind transform transition, which the browser skips
 * automatically under reduced motion because the app disables transitions
 * there globally.
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const labelId = useId();

  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p id={labelId} className="text-[0.9375rem] font-medium">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        /* The switch is drawn at 28px because a 44px pill would look like a
           button, but it must still be a 44px target. `nf-tap` is the platform
           way of saying that: an invisible pseudo-element centred over the
           control, at least 44 in each axis. This row used to hand-roll the
           same trick in Tailwind `before:` utilities, which worked and which
           nothing else copied. */
        className={`nf-tap h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? "border-transparent bg-[var(--nf-brand-primary)]"
            : "border-[var(--nf-border-subtle)] bg-[color-mix(in_oklab,var(--nf-content-primary)_10%,transparent)]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-0.5 top-1/2 block h-[1.375rem] w-[1.375rem] -translate-y-1/2 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.35)] transition-transform duration-200 ease-out ${
            checked ? "translate-x-[1.25rem]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
